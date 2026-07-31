import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { technology } from '@resume-builder/ontologies';

import type {
	Expression,
	Fact,
	Prisma,
	ResumeFact,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/index.js';
import { EmbeddingService } from './embedding.service.js';

const SCHEMA = 'resume_builder';

export type FactWithoutEmbedding = Omit<Fact, 'embedding'>;

export interface CreateFactDto {
	kind: string;
	entityType?: string;
	entityId?: string;
	what: string;
	impact?: string;
	scale?: string;
	citation?: string;
	citationNodeIndex?: number;
	tags?: string[];
	technologies?: string[];
}

export interface UpdateFactDto {
	kind?: string;
	entityType?: string;
	entityId?: string;
	what?: string;
	impact?: string;
	scale?: string;
	citation?: string;
	citationNodeIndex?: number;
	tags?: string[];
	technologies?: string[];
}

export interface FactFilters {
	kind?: string;
	entityType?: string;
	entityId?: string;
}

export interface CreateExpressionDto {
	text: string;
	length?: string;
	tone?: string;
}

export interface LinkFactDto {
	expressionId?: string;
	section?: string;
	position?: number;
}

export interface UpsertFactConceptDto {
	vocabulary: string;
	key: string;
	label: string;
	relation: string;
	source?: string;
	confidence?: number;
}

export type FactConceptWithConcept = Prisma.FactConceptGetPayload<{
	include: { concept: true };
}>;

export interface SimilarFact extends FactWithoutEmbedding {
	distance: number;
}

@Injectable()
export class FactsService {
	private readonly logger = new Logger(FactsService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly embedding: EmbeddingService,
	) {}

	/**
	 * Collapse technology spellings onto their canonical names before storage.
	 *
	 * Names that aren't recognized are kept exactly as supplied — this only
	 * unifies spellings, it never drops data. The unrecognized ones are logged
	 * instead, because that list is the evidence for whether the vocabulary
	 * actually fits the facts we extract in practice.
	 *
	 * The immediate payoff is embedding quality: `factToEmbeddingText` folds
	 * technologies into the text we embed, so `React.js` and `React` currently
	 * produce different vectors for the same underlying fact.
	 */
	private canonicalizeTechnologies(technologies: string[]): string[] {
		const output: string[] = [];
		const seen = new Set<string>();
		const unrecognized: string[] = [];

		for (const label of technologies) {
			const record = technology.resolve(label);
			const name = record?.name ?? label;

			if (record === undefined) {
				unrecognized.push(label);
			}

			if (!seen.has(name)) {
				seen.add(name);
				output.push(name);
			}
		}

		if (unrecognized.length > 0) {
			this.logger.log(
				`[technology-normalization] unrecognized: ${unrecognized.join(', ')}`,
			);
		}

		return output;
	}

	private async syncTechnologyConcepts(
		prisma: Prisma.TransactionClient,
		factId: string,
		technologies: string[],
	): Promise<void> {
		await prisma.factConcept.deleteMany({
			where: {
				factId,
				relation: 'uses',
				concept: { vocabulary: 'technology' },
			},
		});

		for (const name of technologies) {
			const recognized = technology.resolve(name) !== undefined;
			const concept = await prisma.concept.upsert({
				where: {
					vocabulary_key: { vocabulary: 'technology', key: name },
				},
				create: { vocabulary: 'technology', key: name, label: name },
				update: {},
			});

			await prisma.factConcept.create({
				data: {
					factId,
					conceptId: concept.id,
					relation: 'uses',
					source: recognized ? 'ontology-normalizer' : 'user',
					confidence: recognized ? 1 : null,
				},
			});
		}
	}

	// ─── Facts ────────────────────────────────────────────────────────────────

	async create(
		uid: string,
		dto: CreateFactDto,
	): Promise<FactWithoutEmbedding> {
		const technologies = this.canonicalizeTechnologies(
			dto.technologies ?? [],
		);
		const fact = await this.prisma.$transaction(async (prisma) => {
			const created = await prisma.fact.create({
				data: {
					uid,
					kind: dto.kind,
					entityType: dto.entityType,
					entityId: dto.entityId,
					what: dto.what,
					impact: dto.impact,
					scale: dto.scale,
					citation: dto.citation,
					citationNodeIndex: dto.citationNodeIndex,
					tags: dto.tags ?? [],
					technologies,
				},
			});

			await this.syncTechnologyConcepts(prisma, created.id, technologies);
			return created;
		});

		const vector = await this.embedding.embed(
			this.factToEmbeddingText(fact),
		);
		await this.setEmbedding(uid, fact.id, vector);

		return fact;
	}

	async findAll(
		uid: string,
		filters: FactFilters = {},
	): Promise<FactWithoutEmbedding[]> {
		return this.prisma.fact.findMany({
			where: {
				uid,
				...(filters.kind ? { kind: filters.kind } : {}),
				...(filters.entityType
					? { entityType: filters.entityType }
					: {}),
				...(filters.entityId ? { entityId: filters.entityId } : {}),
			},
			orderBy: { createdAt: 'desc' },
		});
	}

	async findById(uid: string, id: string): Promise<FactWithoutEmbedding> {
		const fact = await this.prisma.fact.findFirst({ where: { id, uid } });
		if (!fact) {
			throw new NotFoundException(`Fact ${id} not found`);
		}

		return fact;
	}

	async findByIds(
		uid: string,
		ids: string[],
	): Promise<FactWithoutEmbedding[]> {
		return this.prisma.fact.findMany({ where: { id: { in: ids }, uid } });
	}

	async update(
		uid: string,
		id: string,
		dto: UpdateFactDto,
	): Promise<FactWithoutEmbedding> {
		await this.findById(uid, id);

		// Only touch technologies when the caller actually supplied them —
		// otherwise a partial update would rewrite the column with an empty array.
		const data =
			dto.technologies === undefined
				? dto
				: {
						...dto,
						technologies: this.canonicalizeTechnologies(
							dto.technologies,
						),
					};

		const fact = await this.prisma.$transaction(async (prisma) => {
			const updated = await prisma.fact.update({ where: { id }, data });

			if (data.technologies !== undefined) {
				await this.syncTechnologyConcepts(
					prisma,
					id,
					data.technologies,
				);
			}

			return updated;
		});

		const vector = await this.embedding.embed(
			this.factToEmbeddingText(fact),
		);
		await this.setEmbedding(uid, fact.id, vector);

		return fact;
	}

	async delete(uid: string, id: string): Promise<void> {
		await this.findById(uid, id);
		await this.prisma.fact.delete({ where: { id } });
	}

	// ─── Embeddings ───────────────────────────────────────────────────────────

	async findFactConcepts(
		uid: string,
		factId: string,
	): Promise<FactConceptWithConcept[]> {
		await this.findById(uid, factId);
		return this.prisma.factConcept.findMany({
			where: { factId },
			include: { concept: true },
			orderBy: { createdAt: 'asc' },
		});
	}

	async upsertFactConcept(
		uid: string,
		factId: string,
		dto: UpsertFactConceptDto,
	): Promise<FactConceptWithConcept> {
		await this.findById(uid, factId);
		return this.prisma.$transaction(async (prisma) => {
			const concept = await prisma.concept.upsert({
				where: {
					vocabulary_key: {
						vocabulary: dto.vocabulary,
						key: dto.key,
					},
				},
				create: {
					vocabulary: dto.vocabulary,
					key: dto.key,
					label: dto.label,
				},
				update: {},
			});

			return prisma.factConcept.upsert({
				where: {
					factId_conceptId_relation: {
						factId,
						conceptId: concept.id,
						relation: dto.relation,
					},
				},
				create: {
					factId,
					conceptId: concept.id,
					relation: dto.relation,
					source: dto.source,
					confidence: dto.confidence,
				},
				update: { source: dto.source, confidence: dto.confidence },
				include: { concept: true },
			});
		});
	}

	async deleteFactConcept(
		uid: string,
		factId: string,
		conceptId: string,
		relation: string,
	): Promise<void> {
		await this.findById(uid, factId);
		const deleted = await this.prisma.factConcept.deleteMany({
			where: { factId, conceptId, relation },
		});
		if (deleted.count === 0) {
			throw new NotFoundException(`Concept relationship not found`);
		}
	}

	factToEmbeddingText(fact: {
		what: string;
		impact?: string | null;
		scale?: string | null;
		tags: string[];
		technologies: string[];
	}): string {
		const parts = [fact.what];
		if (fact.impact) {
			parts.push(fact.impact);
		}

		if (fact.scale) {
			parts.push(fact.scale);
		}

		if (fact.tags.length) {
			parts.push(fact.tags.join(', '));
		}

		if (fact.technologies.length) {
			parts.push(fact.technologies.join(', '));
		}

		return parts.join('\n');
	}

	async setEmbedding(
		uid: string,
		id: string,
		vector: number[],
	): Promise<void> {
		await this.findById(uid, id);
		const formatted = `[${vector.join(',')}]`;
		await this.prisma.$executeRawUnsafe(
			`UPDATE "${SCHEMA}"."Fact" SET embedding = $1::resume_builder.vector WHERE id = $2`,
			formatted,
			id,
		);
	}

	async findSimilar(
		uid: string,
		vector: number[],
		limit = 10,
	): Promise<SimilarFact[]> {
		const formatted = `[${vector.join(',')}]`;
		const rows = await this.prisma.$queryRawUnsafe<SimilarFact[]>(
			`SELECT id, uid, kind, "entityType", "entityId", what, impact, scale, citation, "citationNodeIndex", tags, technologies, "createdAt",
              embedding <=> $1::vector AS distance
       FROM "${SCHEMA}"."Fact"
       WHERE uid = $2 AND embedding IS NOT NULL
       ORDER BY distance
       LIMIT $3`,
			formatted,
			uid,
			limit,
		);

		return rows;
	}

	// ─── Expressions ──────────────────────────────────────────────────────────

	async createExpression(
		uid: string,
		factId: string,
		dto: CreateExpressionDto,
	): Promise<Expression> {
		await this.findById(uid, factId);

		return this.prisma.expression.create({
			data: {
				factId,
				text: dto.text,
				length: dto.length,
				tone: dto.tone,
			},
		});
	}

	async findExpressions(uid: string, factId: string): Promise<Expression[]> {
		await this.findById(uid, factId);

		return this.prisma.expression.findMany({
			where: { factId },
			orderBy: { createdAt: 'asc' },
		});
	}

	async deleteExpression(
		uid: string,
		factId: string,
		id: string,
	): Promise<void> {
		await this.findById(uid, factId);
		const expr = await this.prisma.expression.findFirst({
			where: { id, factId },
		});
		if (!expr) {
			throw new NotFoundException(`Expression ${id} not found`);
		}
		await this.prisma.expression.delete({ where: { id } });
	}

	// ─── ResumeFacts ──────────────────────────────────────────────────────────

	async linkFact(
		uid: string,
		resumeId: string,
		factId: string,
		dto: LinkFactDto,
	): Promise<ResumeFact> {
		await this.findById(uid, factId);

		return this.prisma.resumeFact.upsert({
			where: { resumeId_factId: { resumeId, factId } },
			create: { resumeId, factId, ...dto },
			update: dto,
		});
	}

	async findResumeFacts(resumeId: string): Promise<ResumeFact[]> {
		return this.prisma.resumeFact.findMany({
			where: { resumeId },
			include: { fact: true, expression: true },
			orderBy: { position: 'asc' },
		});
	}

	async unlinkFact(resumeId: string, factId: string): Promise<void> {
		const link = await this.prisma.resumeFact.findUnique({
			where: { resumeId_factId: { resumeId, factId } },
		});
		if (!link) {
			throw new NotFoundException(`ResumeFact not found`);
		}
		await this.prisma.resumeFact.delete({
			where: { resumeId_factId: { resumeId, factId } },
		});
	}
}
