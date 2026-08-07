import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { conceptQualifierSchema, type ConceptQualifierValue } from '@resume-builder/entities';
import { technology } from '@resume-builder/ontologies';

import type { Expression, Fact, Prisma, ResumeFact } from '../../generated/prisma/client.js';
import { ConceptRef, ConceptsService, ConceptVocabulary } from '../concepts/concepts.service.js';
import { PrismaService } from '../prisma/index.js';
import { factEmbeddingText } from '../queue/embeddings/embedding-documents.js';
import { EmbeddingQueueService } from '../queue/embeddings/embedding-queue.service.js';
import { EMBEDDING_MODEL, EMBEDDING_PROFILES } from '../queue/embeddings/embedding.constants.js';

const SCHEMA = 'resume_builder';

export type FactWithoutEmbedding = Omit<Fact, 'embedding'>;

export enum FactRelation {
	IsA = 'is-a',
	RelatesTo = 'relates-to',
	About = 'about',
	Uses = 'uses',
	Demonstrates = 'demonstrates',
	Supports = 'supports',
	Produced = 'produced',
}

const RELATION_VOCABULARIES: Record<FactRelation, ConceptVocabulary> = {
	[FactRelation.IsA]: ConceptVocabulary.FactType,
	[FactRelation.RelatesTo]: ConceptVocabulary.Entity,
	[FactRelation.About]: ConceptVocabulary.Topic,
	[FactRelation.Uses]: ConceptVocabulary.Technology,
	[FactRelation.Demonstrates]: ConceptVocabulary.Capability,
	[FactRelation.Supports]: ConceptVocabulary.Outcome,
	[FactRelation.Produced]: ConceptVocabulary.Artifact,
};

export interface FactMeaningDto {
	relation: FactRelation;
	concept: ConceptRef;
	source?: string;
	confidence?: number | null;
	qualifier?: ConceptQualifierValue | null;
}

export interface CreateFactDto {
	what: string;
	impact?: string | null;
	scale?: string | null;
	citation?: string | null;
	citationNodeIndex?: number | null;
	meanings: FactMeaningDto[];
}

export interface UpdateFactDto {
	what?: string;
	impact?: string | null;
	scale?: string | null;
	citation?: string | null;
	citationNodeIndex?: number | null;
	meanings?: FactMeaningDto[];
}

export interface FactFilters {
	relation?: FactRelation;
	vocabulary?: ConceptVocabulary;
	conceptKey?: string;
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

export type FactConceptWithConcept = Prisma.FactConceptGetPayload<{
	include: { concept: true };
}>;

export type FactWithConcepts = Prisma.FactGetPayload<{
	include: { concepts: { include: { concept: true } } };
}>;

export interface SimilarFact extends FactWithConcepts {
	distance: number;
}

@Injectable()
export class FactsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly embeddingQueue: EmbeddingQueueService,
		private readonly conceptsService: ConceptsService,
	) {}

	private async enqueueFact(fact: { id: string; embeddingRevision: number }): Promise<void> {
		await this.embeddingQueue.enqueue({
			entityType: 'fact',
			entityId: fact.id,
			revision: fact.embeddingRevision,
			profile: EMBEDDING_PROFILES.fact,
		});
	}

	private async enqueueConceptsForFact(factId: string): Promise<void> {
		const links = await this.prisma.factConcept.findMany({
			where: { factId },
			include: { concept: true },
		});
		await this.conceptsService.enqueueConcepts(links.map(({ concept }) => concept));
	}

	private conceptKey(label: string): string {
		return label
			.trim()
			.toLocaleLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/(^-|-$)/g, '');
	}

	private normalizeMeaning(meaning: FactMeaningDto): Required<FactMeaningDto> {
		const expectedVocabulary = RELATION_VOCABULARIES[meaning.relation];
		if (!expectedVocabulary || meaning.concept.vocabulary !== expectedVocabulary) {
			throw new BadRequestException(
				`${meaning.relation} relationships must target the ${expectedVocabulary} vocabulary`,
			);
		}

		const suppliedKey = meaning.concept.key.trim();
		const suppliedLabel = meaning.concept.label.trim();
		if (!suppliedKey || !suppliedLabel) {
			throw new BadRequestException('Concept keys and labels cannot be empty');
		}

		let key = suppliedKey;
		let label = suppliedLabel;
		if (expectedVocabulary === ConceptVocabulary.Technology) {
			const record = technology.resolve(suppliedLabel) ?? technology.resolve(suppliedKey);
			key = record?.name ?? suppliedKey;
			label = record?.name ?? suppliedLabel;
		} else if (expectedVocabulary === ConceptVocabulary.Entity) {
			const separator = suppliedKey.indexOf(':');
			if (separator <= 0 || separator === suppliedKey.length - 1) {
				throw new BadRequestException(
					'Entity concept keys must use the form <entity-type>:<identifier>',
				);
			}
			const entityType = this.conceptKey(suppliedKey.slice(0, separator));
			const entityId = this.conceptKey(suppliedKey.slice(separator + 1));
			key = `${entityType}:${entityId}`;
		} else {
			key = this.conceptKey(suppliedKey);
		}

		const confidence = meaning.confidence ?? null;
		if (confidence !== null && (confidence < 0 || confidence > 1)) {
			throw new BadRequestException('Meaning confidence must be between 0 and 1');
		}

		return {
			relation: meaning.relation,
			concept: { vocabulary: expectedVocabulary, key, label },
			source: meaning.source?.trim() || 'user',
			confidence,
			qualifier: meaning.qualifier ? conceptQualifierSchema.parse(meaning.qualifier) : null,
		};
	}

	private validateMeanings(meanings: FactMeaningDto[]): void {
		const typeCount = meanings.filter(
			(meaning) => meaning.relation === FactRelation.IsA,
		).length;
		if (typeCount !== 1) {
			throw new BadRequestException('A fact must have exactly one is-a fact-type meaning');
		}
		if (!meanings.some((meaning) => meaning.relation === FactRelation.RelatesTo)) {
			throw new BadRequestException('A fact must relate to at least one entity');
		}
	}

	private async replaceMeanings(
		prisma: Prisma.TransactionClient,
		factId: string,
		meanings: FactMeaningDto[],
	): Promise<void> {
		this.validateMeanings(meanings);
		const normalized = meanings.map((meaning) => this.normalizeMeaning(meaning));
		await this.conceptsService.lockConcepts(
			prisma,
			normalized.map((meaning) => meaning.concept),
		);
		await prisma.factConcept.deleteMany({ where: { factId } });

		const seen = new Set<string>();
		for (const meaning of normalized) {
			const identity = `${meaning.relation}:${meaning.concept.vocabulary}:${meaning.concept.key}`;
			if (seen.has(identity)) {
				continue;
			}
			seen.add(identity);
			const concept = await this.conceptsService.upsertConcept(prisma, meaning.concept);

			await prisma.factConcept.create({
				data: {
					factId,
					conceptId: concept.id,
					relation: meaning.relation,
					source: meaning.source,
					confidence: meaning.confidence,
					qualifier: meaning.qualifier,
				},
			});
		}
	}

	// ─── Facts ────────────────────────────────────────────────────────────────

	async create(uid: string, dto: CreateFactDto): Promise<FactWithConcepts> {
		const created = await this.prisma.$transaction(async (prisma) => {
			const created = await prisma.fact.create({
				data: {
					uid,
					what: dto.what,
					impact: dto.impact,
					scale: dto.scale,
					citation: dto.citation,
					citationNodeIndex: dto.citationNodeIndex,
				},
			});

			await this.replaceMeanings(prisma, created.id, dto.meanings);

			return created;
		});

		const fact = await this.findById(uid, created.id);
		await Promise.all([this.enqueueFact(fact), this.enqueueConceptsForFact(fact.id)]);

		return fact;
	}

	async findAll(uid: string, filters: FactFilters = {}): Promise<FactWithConcepts[]> {
		const hasMeaningFilter =
			filters.relation !== undefined ||
			filters.vocabulary !== undefined ||
			filters.conceptKey !== undefined;

		return this.prisma.fact.findMany({
			where: {
				uid,
				...(hasMeaningFilter
					? {
							concepts: {
								some: {
									...(filters.relation ? { relation: filters.relation } : {}),
									concept: {
										...(filters.vocabulary
											? { vocabulary: filters.vocabulary }
											: {}),
										...(filters.conceptKey
											? { key: filters.conceptKey.trim() }
											: {}),
									},
								},
							},
						}
					: {}),
			},
			include: { concepts: { include: { concept: true } } },
			orderBy: { createdAt: 'desc' },
		});
	}

	async findById(uid: string, id: string): Promise<FactWithConcepts> {
		const fact = await this.prisma.fact.findFirst({
			where: { id, uid },
			include: { concepts: { include: { concept: true } } },
		});
		if (!fact) {
			throw new NotFoundException(`Fact ${id} not found`);
		}

		return fact;
	}

	async findByIds(uid: string, ids: string[]): Promise<FactWithConcepts[]> {
		return this.prisma.fact.findMany({
			where: { id: { in: ids }, uid },
			include: { concepts: { include: { concept: true } } },
		});
	}

	async update(uid: string, id: string, dto: UpdateFactDto): Promise<FactWithConcepts> {
		await this.findById(uid, id);
		const { meanings, ...data } = dto;

		await this.prisma.$transaction(async (prisma) => {
			await prisma.fact.update({
				where: { id },
				data: { ...data, embeddingRevision: { increment: 1 } },
			});
			if (meanings !== undefined) {
				await this.replaceMeanings(prisma, id, meanings);
			}
		});

		const fact = await this.findById(uid, id);
		await Promise.all([this.enqueueFact(fact), this.enqueueConceptsForFact(fact.id)]);

		return fact;
	}

	async delete(uid: string, id: string): Promise<void> {
		await this.findById(uid, id);
		await this.prisma.fact.delete({ where: { id } });
	}

	// ─── Concepts ─────────────────────────────────────────────────────────────

	async findFactConcepts(uid: string, factId: string): Promise<FactConceptWithConcept[]> {
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
		meaning: FactMeaningDto,
	): Promise<FactConceptWithConcept> {
		await this.findById(uid, factId);
		const normalized = this.normalizeMeaning(meaning);
		const result = await this.prisma.$transaction(async (prisma) => {
			await this.conceptsService.lockConcepts(prisma, [normalized.concept]);
			if (normalized.relation === FactRelation.IsA) {
				await prisma.factConcept.deleteMany({
					where: { factId, relation: FactRelation.IsA },
				});
			}

			const concept = await this.conceptsService.upsertConcept(prisma, normalized.concept);

			const link = await prisma.factConcept.upsert({
				where: {
					factId_conceptId_relation: {
						factId,
						conceptId: concept.id,
						relation: normalized.relation,
					},
				},
				create: {
					factId,
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
			const fact = await prisma.fact.update({
				where: { id: factId },
				data: { embeddingRevision: { increment: 1 } },
				select: { id: true, embeddingRevision: true },
			});

			return { link, fact };
		});
		await Promise.all([
			this.enqueueFact(result.fact),
			this.conceptsService.enqueueConcept(result.link.concept),
		]);

		return result.link;
	}

	async deleteFactConcept(
		uid: string,
		factId: string,
		conceptId: string,
		relation: string,
	): Promise<void> {
		await this.findById(uid, factId);
		if (relation === FactRelation.IsA || relation === FactRelation.RelatesTo) {
			const count = await this.prisma.factConcept.count({ where: { factId, relation } });
			if (count <= 1) {
				throw new BadRequestException(
					`A fact must retain at least one ${relation} meaning`,
				);
			}
		}
		const fact = await this.prisma.$transaction(async (prisma) => {
			const deleted = await prisma.factConcept.deleteMany({
				where: { factId, conceptId, relation },
			});
			if (deleted.count === 0) {
				throw new NotFoundException(`Concept relationship not found`);
			}

			return prisma.fact.update({
				where: { id: factId },
				data: { embeddingRevision: { increment: 1 } },
				select: { id: true, embeddingRevision: true },
			});
		});
		await this.enqueueFact(fact);
	}

	factToEmbeddingText(fact: {
		what: string;
		impact?: string | null;
		scale?: string | null;
		concepts: FactConceptWithConcept[];
	}): string {
		return factEmbeddingText(fact);
	}

	async findSimilar(uid: string, vector: number[], limit = 10): Promise<SimilarFact[]> {
		const formatted = `[${vector.join(',')}]`;
		const rows = await this.prisma.$queryRawUnsafe<
			Array<FactWithoutEmbedding & { distance: number }>
		>(
			`SELECT id, uid, what, impact, scale, citation, "citationNodeIndex", "createdAt",
              embedding OPERATOR(${SCHEMA}.<=>) $1::${SCHEMA}.vector AS distance
       FROM "${SCHEMA}"."Fact"
       WHERE uid = $2 AND embedding IS NOT NULL
         AND "embeddedRevision" = "embeddingRevision"
         AND "embeddingModel" = $4
         AND "embeddingProfile" = $5
       ORDER BY distance
       LIMIT $3`,
			formatted,
			uid,
			limit,
			EMBEDDING_MODEL,
			EMBEDDING_PROFILES.fact,
		);

		const concepts = await this.prisma.factConcept.findMany({
			where: { factId: { in: rows.map((row) => row.id) } },
			include: { concept: true },
		});

		return rows.map((row) => ({
			...row,
			concepts: concepts.filter((link) => link.factId === row.id),
		}));
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

	async deleteExpression(uid: string, factId: string, id: string): Promise<void> {
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
			include: {
				fact: {
					include: { concepts: { include: { concept: true } } },
				},
				expression: true,
			},
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
