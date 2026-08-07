import { Injectable, NotFoundException } from '@nestjs/common';
import { technology, technologyCategory } from '@resume-builder/ontologies';

import type { Concept, ConceptAlias, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/index.js';
import { EmbeddingQueueService } from '../queue/embeddings/embedding-queue.service.js';
import { EMBEDDING_MODEL, EMBEDDING_PROFILES } from '../queue/embeddings/embedding.constants.js';

const SCHEMA = 'resume_builder';

export enum ConceptVocabulary {
	FactType = 'fact-type',
	Entity = 'entity',
	Topic = 'topic',
	Technology = 'technology',
	Capability = 'capability',
	Outcome = 'outcome',
	Artifact = 'artifact',
}

export interface ConceptRef {
	vocabulary: string;
	key: string;
	label: string;
}

export interface ConceptSuggestion {
	vocabulary: string;
	key: string;
	label: string;
	definition?: string | null;
}

export interface ConceptSearchMatch {
	concept: Concept;
	score: number;
}

export interface ConceptRelationEdge {
	direction: 'outgoing' | 'incoming';
	relation: string;
	source: string;
	confidence: number | null;
	concept: Concept;
}

@Injectable()
export class ConceptsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly embeddingQueue: EmbeddingQueueService,
	) {}

	async enqueueConcept(concept: { id: string; embeddingRevision: number }): Promise<void> {
		await this.embeddingQueue.enqueue({
			entityType: 'concept',
			entityId: concept.id,
			revision: concept.embeddingRevision,
			profile: EMBEDDING_PROFILES.concept,
		});
	}

	async enqueueConcepts(
		concepts: Array<{ id: string; embeddingRevision: number }>,
	): Promise<void> {
		await this.embeddingQueue.enqueueMany(
			concepts.map((concept) => ({
				entityType: 'concept' as const,
				entityId: concept.id,
				revision: concept.embeddingRevision,
				profile: EMBEDDING_PROFILES.concept,
			})),
		);
	}

	/**
	 * Acquires transaction-scoped advisory locks for each concept identity so
	 * concurrent transactions can't race on the same (vocabulary, key) upsert.
	 * Sorting the identities prevents deadlocks when two callers share several
	 * concepts. Callers must lock before calling `upsertConcept`.
	 */
	async lockConcepts(prisma: Prisma.TransactionClient, concepts: ConceptRef[]): Promise<void> {
		const identities = new Map(
			concepts.map((concept) => [`${concept.vocabulary}:${concept.key}`, concept]),
		);

		for (const [, concept] of [...identities.entries()].sort(([left], [right]) =>
			left.localeCompare(right),
		)) {
			await prisma.$queryRawUnsafe(
				'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))::text',
				concept.vocabulary,
				concept.key,
			);
		}
	}

	/** Upserts a single concept. Callers must hold the lock for `ref` (see `lockConcepts`). */
	async upsertConcept(prisma: Prisma.TransactionClient, ref: ConceptRef): Promise<Concept> {
		return prisma.concept.upsert({
			where: { vocabulary_key: { vocabulary: ref.vocabulary, key: ref.key } },
			create: ref,
			update: { label: ref.label, embeddingRevision: { increment: 1 } },
		});
	}

	async findConceptById(id: string): Promise<Concept> {
		const concept = await this.prisma.concept.findUnique({ where: { id } });
		if (!concept) {
			throw new NotFoundException(`Concept ${id} not found`);
		}

		return concept;
	}

	async findConceptSuggestions(
		uid: string,
		vocabulary: string,
		search = '',
		requestedLimit = 20,
	): Promise<ConceptSuggestion[]> {
		const limit = Math.max(1, Math.min(requestedLimit, 50));
		const query = search.trim().toLocaleLowerCase();

		if (vocabulary === 'technology') {
			const exact = search.trim() ? technology.resolve(search)?.name : undefined;

			return technology
				.all()
				.filter((record) =>
					query ? record.name.toLocaleLowerCase().includes(query) : true,
				)
				.sort((left, right) => {
					if (left.name === exact) {
						return -1;
					}
					if (right.name === exact) {
						return 1;
					}
					const leftStarts = left.name.toLocaleLowerCase().startsWith(query);
					const rightStarts = right.name.toLocaleLowerCase().startsWith(query);
					if (leftStarts !== rightStarts) {
						return leftStarts ? -1 : 1;
					}
					if (left.hot !== right.hot) {
						return left.hot ? -1 : 1;
					}
					if (left.inDemand !== right.inDemand) {
						return left.inDemand ? -1 : 1;
					}

					return left.name.localeCompare(right.name);
				})
				.slice(0, limit)
				.map((record) => ({
					vocabulary,
					key: record.name,
					label: record.name,
					definition: technologyCategory.has(record.category)
						? technologyCategory.get(record.category).label
						: undefined,
				}));
		}

		return this.prisma.concept.findMany({
			where: {
				vocabulary,
				OR: [
					{ facts: { some: { fact: { uid } } } },
					{ bullets: { some: { bullet: { uid } } } },
					{ jobRequirements: { some: { jobRequirement: { uid } } } },
				],
				...(query
					? { label: { contains: search.trim(), mode: 'insensitive' as const } }
					: {}),
			},
			select: { vocabulary: true, key: true, label: true, definition: true },
			orderBy: { label: 'asc' },
			take: limit,
		});
	}

	async findSimilarConcepts(
		uid: string,
		vector: number[],
		vocabulary?: string,
		requestedLimit = 10,
		minimumScore = 0.55,
	): Promise<ConceptSearchMatch[]> {
		const formatted = `[${vector.join(',')}]`;
		const limit = Math.max(1, Math.min(requestedLimit, 50));
		const boundedMinimumScore = Math.max(0, Math.min(minimumScore, 1));
		const maximumDistance = 1 - boundedMinimumScore;
		const rows = await this.prisma.$queryRawUnsafe<Array<{ id: string; distance: number }>>(
			`SELECT c.id,
              c.embedding OPERATOR(${SCHEMA}.<=>) $1::${SCHEMA}.vector AS distance
       FROM "${SCHEMA}"."Concept" c
       WHERE c.embedding IS NOT NULL
         AND c."embeddedRevision" = c."embeddingRevision"
         AND c."embeddingModel" = $3
         AND c."embeddingProfile" = $4
         AND ($5::text IS NULL OR c.vocabulary = $5)
         AND (
           EXISTS (
             SELECT 1
             FROM "${SCHEMA}"."FactConcept" fc
             JOIN "${SCHEMA}"."Fact" f ON f.id = fc."factId"
             WHERE fc."conceptId" = c.id AND f.uid = $2
           )
           OR EXISTS (
             SELECT 1
             FROM "${SCHEMA}"."BulletConcept" bc
             JOIN "${SCHEMA}"."Bullet" b ON b.id = bc."bulletId"
             WHERE bc."conceptId" = c.id AND b.uid = $2
           )
         )
         AND c.embedding OPERATOR(${SCHEMA}.<=>) $1::${SCHEMA}.vector <= $6
       ORDER BY distance
       LIMIT $7`,
			formatted,
			uid,
			EMBEDDING_MODEL,
			EMBEDDING_PROFILES.concept,
			vocabulary ?? null,
			maximumDistance,
			limit,
		);

		const concepts = await this.prisma.concept.findMany({
			where: { id: { in: rows.map(({ id }) => id) } },
		});
		const conceptsById = new Map(concepts.map((concept) => [concept.id, concept]));

		return rows.flatMap(({ id, distance }) => {
			const concept = conceptsById.get(id);

			return concept
				? [{ concept, score: Math.max(0, Math.min(1, 1 - Number(distance))) }]
				: [];
		});
	}

	async findConceptRelations(
		conceptId: string,
		relation?: string,
	): Promise<ConceptRelationEdge[]> {
		await this.findConceptById(conceptId);
		const [outgoing, incoming] = await Promise.all([
			this.prisma.conceptRelation.findMany({
				where: { sourceConceptId: conceptId, ...(relation ? { relation } : {}) },
				include: { targetConcept: true },
			}),
			this.prisma.conceptRelation.findMany({
				where: { targetConceptId: conceptId, ...(relation ? { relation } : {}) },
				include: { sourceConcept: true },
			}),
		]);

		return [
			...outgoing.map((edge) => ({
				direction: 'outgoing' as const,
				relation: edge.relation,
				source: edge.source,
				confidence: edge.confidence,
				concept: edge.targetConcept,
			})),
			...incoming.map((edge) => ({
				direction: 'incoming' as const,
				relation: edge.relation,
				source: edge.source,
				confidence: edge.confidence,
				concept: edge.sourceConcept,
			})),
		];
	}

	async findConceptAliases(conceptId: string): Promise<ConceptAlias[]> {
		await this.findConceptById(conceptId);

		return this.prisma.conceptAlias.findMany({
			where: { conceptId },
			orderBy: { label: 'asc' },
		});
	}
}
