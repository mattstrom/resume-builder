import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
	BulletMeaningInput,
	BulletFilterInput,
	BulletSourceType,
	BulletStatus,
	createBulletSchema,
	CreateBulletInput,
	updateBulletSchema,
	UpdateBulletInput,
} from '@resume-builder/entities';
import { technology } from '@resume-builder/ontologies';

import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/index.js';

const RELATION_VOCABULARIES = {
	'is-a': 'fact-type',
	'relates-to': 'entity',
	about: 'topic',
	uses: 'technology',
	demonstrates: 'capability',
	supports: 'outcome',
	produced: 'artifact',
} as const;

@Injectable()
export class BulletsService {
	constructor(private readonly prisma: PrismaService) {}

	async findAll(uid: string, filter: BulletFilterInput = {}): Promise<BulletWithConcepts[]> {
		return this.prisma.bullet.findMany({
			where: {
				uid,
				...(filter.sourceType ? { sourceType: filter.sourceType } : {}),
				...(filter.sourceId ? { sourceId: filter.sourceId } : {}),
				...(filter.status
					? { status: filter.status }
					: filter.includeArchived
						? {}
						: { status: { not: BulletStatus.ARCHIVED } }),
				...(filter.search?.trim()
					? {
							OR: [
								{ text: { contains: filter.search.trim(), mode: 'insensitive' } },
								{
									concepts: {
										some: {
											concept: {
												label: {
													contains: filter.search.trim(),
													mode: 'insensitive',
												},
											},
										},
									},
								},
							],
						}
					: {}),
				...(filter.conceptKey?.trim()
					? {
							concepts: {
								some: {
									relation: 'demonstrates',
									concept: {
										vocabulary: 'capability',
										key: filter.conceptKey.trim(),
									},
								},
							},
						}
					: {}),
			},
			include: { concepts: { include: { concept: true } } },
			orderBy: [
				{ sourceType: 'asc' },
				{ sourceId: 'asc' },
				{ position: 'asc' },
				{ createdAt: 'asc' },
			],
		});
	}

	async find(uid: string, id: string): Promise<BulletWithConcepts> {
		const bullet = await this.prisma.bullet.findFirst({
			where: { id, uid },
			include: { concepts: { include: { concept: true } } },
		});
		if (!bullet) throw new NotFoundException(`Bullet with id ${id} not found`);
		return bullet;
	}

	async create(uid: string, input: CreateBulletInput): Promise<BulletWithConcepts> {
		const parsed = createBulletSchema.safeParse(input);
		if (!parsed.success) {
			throw new BadRequestException(
				parsed.error.issues.map(({ message }) => message).join('; '),
			);
		}
		const data = parsed.data;
		await this.assertSource(uid, data.sourceType, data.sourceId);
		const lastBullet = await this.prisma.bullet.findFirst({
			where: { uid, sourceType: data.sourceType, sourceId: data.sourceId },
			orderBy: { position: 'desc' },
			select: { position: true },
		});
		return this.prisma.bullet.create({
			data: { ...data, uid, position: (lastBullet?.position ?? -1) + 1 },
			include: { concepts: { include: { concept: true } } },
		});
	}

	async update(uid: string, id: string, input: UpdateBulletInput): Promise<BulletWithConcepts> {
		await this.find(uid, id);
		const parsed = updateBulletSchema.safeParse(input);
		if (!parsed.success) {
			throw new BadRequestException(
				parsed.error.issues.map(({ message }) => message).join('; '),
			);
		}
		const data = parsed.data;
		return this.prisma.bullet.update({
			where: { id },
			data,
			include: { concepts: { include: { concept: true } } },
		});
	}

	async setStatus(uid: string, id: string, status: BulletStatus): Promise<BulletWithConcepts> {
		await this.find(uid, id);
		return this.prisma.bullet.update({
			where: { id },
			data: { status },
			include: { concepts: { include: { concept: true } } },
		});
	}

	async reorder(uid: string, id: string, targetId: string): Promise<BulletWithConcepts[]> {
		if (id === targetId) return [await this.find(uid, id)];

		const bullets = await this.prisma.bullet.findMany({
			where: { uid, id: { in: [id, targetId] } },
		});
		if (bullets.length !== 2) {
			throw new NotFoundException('One or more bullets could not be found');
		}

		const bullet = bullets.find((candidate) => candidate.id === id)!;
		const target = bullets.find((candidate) => candidate.id === targetId)!;
		if (bullet.sourceType !== target.sourceType || bullet.sourceId !== target.sourceId) {
			throw new BadRequestException('Bullets can only be reordered within the same source');
		}

		return this.prisma.$transaction([
			this.prisma.bullet.update({
				where: { id: bullet.id },
				data: { position: target.position },
				include: { concepts: { include: { concept: true } } },
			}),
			this.prisma.bullet.update({
				where: { id: target.id },
				data: { position: bullet.position },
				include: { concepts: { include: { concept: true } } },
			}),
		]);
	}

	async upsertConcept(uid: string, bulletId: string, meaning: BulletMeaningInput) {
		await this.find(uid, bulletId);
		const normalized = this.normalizeMeaning(meaning);

		return this.prisma.$transaction(async (prisma) => {
			const concept = await prisma.concept.upsert({
				where: {
					vocabulary_key: {
						vocabulary: normalized.concept.vocabulary,
						key: normalized.concept.key,
					},
				},
				create: normalized.concept,
				update: { label: normalized.concept.label },
			});
			return prisma.bulletConcept.upsert({
				where: {
					bulletId_conceptId_relation: {
						bulletId,
						conceptId: concept.id,
						relation: normalized.relation,
					},
				},
				create: {
					bulletId,
					conceptId: concept.id,
					relation: normalized.relation,
					source: normalized.source,
					confidence: normalized.confidence,
				},
				update: {
					source: normalized.source,
					confidence: normalized.confidence,
				},
				include: { concept: true },
			});
		});
	}

	async replaceGeneratedConcepts(
		uid: string,
		bulletId: string,
		expectedText: string,
		meanings: BulletMeaningInput[],
	) {
		const normalized = meanings.map((meaning) =>
			this.normalizeMeaning({ ...meaning, source: 'classifier' }),
		);

		return this.prisma.$transaction(async (prisma) => {
			const bullet = await prisma.bullet.findFirst({
				where: { id: bulletId, uid },
				select: { text: true },
			});
			if (!bullet) throw new NotFoundException(`Bullet with id ${bulletId} not found`);
			if (bullet.text !== expectedText.trim()) {
				throw new BadRequestException(
					'The bullet changed while concepts were being analyzed. Analyze it again.',
				);
			}

			await prisma.bulletConcept.deleteMany({
				where: { bulletId, source: 'classifier' },
			});

			const links = [];
			for (const meaning of normalized) {
				const concept = await prisma.concept.upsert({
					where: {
						vocabulary_key: {
							vocabulary: meaning.concept.vocabulary,
							key: meaning.concept.key,
						},
					},
					create: meaning.concept,
					update: { label: meaning.concept.label },
				});
				links.push({
					bulletId,
					conceptId: concept.id,
					relation: meaning.relation,
					source: 'classifier',
					confidence: meaning.confidence,
				});
			}

			if (links.length > 0) {
				await prisma.bulletConcept.createMany({ data: links, skipDuplicates: true });
			}

			return prisma.bulletConcept.findMany({
				where: { bulletId },
				include: { concept: true },
				orderBy: { createdAt: 'asc' },
			});
		});
	}

	async deleteConcept(
		uid: string,
		bulletId: string,
		conceptId: string,
		relation: string,
	): Promise<void> {
		await this.find(uid, bulletId);
		const deleted = await this.prisma.bulletConcept.deleteMany({
			where: { bulletId, conceptId, relation },
		});
		if (deleted.count === 0) {
			throw new NotFoundException('Bullet concept relationship not found');
		}
	}

	async archiveForSource(
		uid: string,
		sourceType: BulletSourceType,
		sourceId: string,
	): Promise<void> {
		await this.prisma.bullet.updateMany({
			where: { uid, sourceType, sourceId },
			data: { status: BulletStatus.ARCHIVED },
		});
	}

	private async assertSource(
		uid: string,
		sourceType: BulletSourceType,
		sourceId: string,
	): Promise<void> {
		const where = { id: sourceId, uid };
		const source =
			sourceType === BulletSourceType.JOB
				? await this.prisma.job.findFirst({ where, select: { id: true } })
				: sourceType === BulletSourceType.PROJECT
					? await this.prisma.project.findFirst({ where, select: { id: true } })
					: await this.prisma.volunteering.findFirst({ where, select: { id: true } });

		if (!source) {
			throw new BadRequestException(
				`The ${sourceType} source ${sourceId} does not belong to the current user`,
			);
		}
	}

	private conceptKey(label: string): string {
		return label
			.trim()
			.toLocaleLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/(^-|-$)/g, '');
	}

	private normalizeMeaning(meaning: BulletMeaningInput) {
		const relation = meaning.relation.trim() as keyof typeof RELATION_VOCABULARIES;
		const vocabulary = RELATION_VOCABULARIES[relation];
		if (!vocabulary || meaning.concept.vocabulary !== vocabulary) {
			throw new BadRequestException(
				`${meaning.relation} relationships must target the ${vocabulary ?? 'known'} vocabulary`,
			);
		}

		const suppliedKey = meaning.concept.key.trim();
		const suppliedLabel = meaning.concept.label.trim();
		if (!suppliedKey || !suppliedLabel) {
			throw new BadRequestException('Concept keys and labels cannot be empty');
		}

		let key = suppliedKey;
		let label = suppliedLabel;
		if (vocabulary === 'technology') {
			const record = technology.resolve(suppliedLabel) ?? technology.resolve(suppliedKey);
			key = record?.name ?? suppliedKey;
			label = record?.name ?? suppliedLabel;
		} else if (vocabulary === 'entity') {
			const separator = suppliedKey.indexOf(':');
			if (separator <= 0 || separator === suppliedKey.length - 1) {
				throw new BadRequestException(
					'Entity concept keys must use the form <entity-type>:<identifier>',
				);
			}
			key = `${this.conceptKey(suppliedKey.slice(0, separator))}:${this.conceptKey(
				suppliedKey.slice(separator + 1),
			)}`;
		} else {
			key = this.conceptKey(suppliedKey);
		}

		const confidence = meaning.confidence ?? null;
		if (confidence !== null && (confidence < 0 || confidence > 1)) {
			throw new BadRequestException('Meaning confidence must be between 0 and 1');
		}

		return {
			relation,
			concept: { vocabulary, key, label },
			source: meaning.source?.trim() || 'user',
			confidence,
		};
	}
}

type BulletWithConcepts = Prisma.BulletGetPayload<{
	include: { concepts: { include: { concept: true } } };
}>;
