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
import { ConceptsService } from '../../concepts/concepts.service.js';
import { PrismaService } from '../../prisma/index.js';
import { EmbeddingQueueService } from '../../queue/embeddings/embedding-queue.service.js';
import { EMBEDDING_MODEL, EMBEDDING_PROFILES } from '../../queue/embeddings/embedding.constants.js';
import { EmbeddingService } from '../../queue/embeddings/embedding.service.js';

const SCHEMA = 'resume_builder';

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
	constructor(
		private readonly prisma: PrismaService,
		private readonly embeddingQueue: EmbeddingQueueService,
		private readonly embedding: EmbeddingService,
		private readonly conceptsService: ConceptsService,
	) {}

	private async enqueueBullet(bullet: { id: string; embeddingRevision: number }): Promise<void> {
		await this.embeddingQueue.enqueue({
			entityType: 'bullet',
			entityId: bullet.id,
			revision: bullet.embeddingRevision,
			profile: EMBEDDING_PROFILES.bullet,
		});
	}

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

	async search(
		uid: string,
		query: string,
		filter: BulletFilterInput = {},
		limit = 10,
		minimumScore = 0.55,
	): Promise<BulletSearchMatch[]> {
		const text = query.trim();
		if (!text) return [];

		const vector = await this.embedding.embed(text);
		const formatted = `[${vector.join(',')}]`;
		const boundedLimit = Math.max(1, Math.min(limit, 50));
		const boundedMinimumScore = Math.max(0, Math.min(minimumScore, 1));
		const maximumDistance = 1 - boundedMinimumScore;
		const excludeArchived = !filter.status && !filter.includeArchived;
		const rows = await this.prisma.$queryRawUnsafe<Array<{ id: string; distance: number }>>(
			`SELECT id, embedding OPERATOR(${SCHEMA}.<=>) $1::${SCHEMA}.vector AS distance
       FROM "${SCHEMA}"."Bullet"
       WHERE uid = $2 AND embedding IS NOT NULL
         AND "embeddedRevision" = "embeddingRevision"
         AND "embeddingModel" = $3
         AND "embeddingProfile" = $4
         AND ($5::text IS NULL OR "sourceType"::text = $5)
         AND ($6::text IS NULL OR "sourceId" = $6)
         AND ($7::text IS NULL OR status::text = $7)
         AND (NOT $8::boolean OR status::text <> 'archived')
         AND embedding OPERATOR(${SCHEMA}.<=>) $1::${SCHEMA}.vector <= $9
       ORDER BY distance
       LIMIT $10`,
			formatted,
			uid,
			EMBEDDING_MODEL,
			EMBEDDING_PROFILES.bullet,
			filter.sourceType ?? null,
			filter.sourceId ?? null,
			filter.status ?? null,
			excludeArchived,
			maximumDistance,
			boundedLimit,
		);

		const bullets = await this.prisma.bullet.findMany({
			where: { id: { in: rows.map(({ id }) => id) }, uid },
			include: { concepts: { include: { concept: true } } },
		});
		const bulletsById = new Map(bullets.map((bullet) => [bullet.id, bullet]));

		return rows.flatMap(({ id, distance }) => {
			const bullet = bulletsById.get(id);
			return bullet
				? [{ bullet, score: Math.max(0, Math.min(1, 1 - Number(distance))) }]
				: [];
		});
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
		const bullet = await this.prisma.bullet.create({
			data: { ...data, uid, position: (lastBullet?.position ?? -1) + 1 },
			include: { concepts: { include: { concept: true } } },
		});
		await this.enqueueBullet(bullet);
		return bullet;
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
		const bullet = await this.prisma.bullet.update({
			where: { id },
			data: {
				...data,
				...(data.text !== undefined ? { embeddingRevision: { increment: 1 } } : {}),
			},
			include: { concepts: { include: { concept: true } } },
		});
		if (data.text !== undefined) await this.enqueueBullet(bullet);
		return bullet;
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

		const result = await this.prisma.$transaction(async (prisma) => {
			await this.conceptsService.lockConcepts(prisma, [normalized.concept]);
			const concept = await this.conceptsService.upsertConcept(prisma, normalized.concept);
			const link = await prisma.bulletConcept.upsert({
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
			const bullet = await prisma.bullet.update({
				where: { id: bulletId },
				data: { embeddingRevision: { increment: 1 } },
				select: { id: true, embeddingRevision: true },
			});
			return { link, bullet };
		});
		await Promise.all([
			this.enqueueBullet(result.bullet),
			this.conceptsService.enqueueConcept(result.link.concept),
		]);
		return result.link;
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

		const result = await this.prisma.$transaction(async (prisma) => {
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

			await this.conceptsService.lockConcepts(
				prisma,
				normalized.map((meaning) => meaning.concept),
			);

			const links: Prisma.BulletConceptCreateManyInput[] = [];
			for (const meaning of normalized) {
				const concept = await this.conceptsService.upsertConcept(prisma, meaning.concept);
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

			const concepts = await prisma.bulletConcept.findMany({
				where: { bulletId },
				include: { concept: true },
				orderBy: { createdAt: 'asc' },
			});
			const updatedBullet = await prisma.bullet.update({
				where: { id: bulletId },
				data: { embeddingRevision: { increment: 1 } },
				select: { id: true, embeddingRevision: true },
			});
			return { concepts, bullet: updatedBullet };
		});
		await Promise.all([
			this.enqueueBullet(result.bullet),
			this.conceptsService.enqueueConcepts(result.concepts.map(({ concept }) => concept)),
		]);
		return result.concepts;
	}

	async deleteConcept(
		uid: string,
		bulletId: string,
		conceptId: string,
		relation: string,
	): Promise<void> {
		await this.find(uid, bulletId);
		const bullet = await this.prisma.$transaction(async (prisma) => {
			const deleted = await prisma.bulletConcept.deleteMany({
				where: { bulletId, conceptId, relation },
			});
			if (deleted.count === 0) {
				throw new NotFoundException('Bullet concept relationship not found');
			}
			return prisma.bullet.update({
				where: { id: bulletId },
				data: { embeddingRevision: { increment: 1 } },
				select: { id: true, embeddingRevision: true },
			});
		});
		await this.enqueueBullet(bullet);
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

interface BulletSearchMatch {
	bullet: BulletWithConcepts;
	score: number;
}
