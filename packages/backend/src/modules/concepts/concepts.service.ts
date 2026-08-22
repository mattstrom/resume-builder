import { Injectable, NotFoundException } from '@nestjs/common';
import { looseKey, technology, technologyCategory, tightKey } from '@resume-builder/ontologies';

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
	TechnologyCategory = 'technology-category',
	Capability = 'capability',
	Outcome = 'outcome',
	Artifact = 'artifact',
}

/**
 * Vocabularies a free-text profile label may resolve into beyond `technology`.
 *
 * Order is priority order: a label matching an existing concept in both lands on
 * the capability. These are matched against concepts *already in the graph* —
 * unlike `technology`, neither has an external authority to check a novel label
 * against, so resolution can recognize them but never mint them.
 */
const RESOLVABLE_VOCABULARIES: readonly string[] = [
	ConceptVocabulary.Capability,
	ConceptVocabulary.Topic,
];

/** Predicate for the `ConceptRelation` edges mirroring an ontology hierarchy. */
export const BROADER = 'broader';

export interface ConceptRef {
	vocabulary: string;
	key: string;
	label: string;
}

/** A free-text label paired with the concept identity it resolved to. */
export interface ResolvedLabel {
	/** The label as written by the author, preserved for alias recording. */
	label: string;
	concept: ConceptRef;
}

export interface LabelResolution {
	resolved: ResolvedLabel[];
	/** Labels that matched no authority. The backlog of aliases worth authoring. */
	unresolved: string[];
}

/** Concepts persisted for a set of labels, plus the labels that named none. */
export interface MaterializedLabels {
	concepts: Concept[];
	unresolved: string[];
}

/** A label matched to a persisted concept and everything above it. */
export interface ResolvedLabelConcepts {
	/** The label as written by the author. */
	label: string;
	conceptId: string;
	/** Ancestor concept ids, so a leaf skill can answer a broader requirement. */
	broaderConceptIds: string[];
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
		// Ancestors are locked alongside their concept because `upsertConcept`
		// materializes the hierarchy above whatever it writes. Without them, two
		// transactions upserting different technologies that share a category
		// would race on that category.
		const withAncestors = concepts.flatMap((concept) => [
			concept,
			...this.ontologyAncestors(concept),
		]);
		const identities = new Map(
			withAncestors.map((concept) => [`${concept.vocabulary}:${concept.key}`, concept]),
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

	/**
	 * The concept chain the ontology places above `ref`, nearest parent first.
	 *
	 * Only `technology` has an authored hierarchy today: a technology sits under
	 * one of ~118 O*NET categories, which sits under one of 17 authored buckets.
	 * Pure and sync so callers can fold the chain into a lock set before writing.
	 */
	ontologyAncestors(ref: ConceptRef): ConceptRef[] {
		if (ref.vocabulary !== ConceptVocabulary.Technology) {
			return [];
		}

		const record = technology.resolve(ref.key);
		if (record === undefined || !technologyCategory.has(record.category)) {
			return [];
		}

		return [record.category, ...technologyCategory.ancestors(record.category)].map((key) => ({
			vocabulary: ConceptVocabulary.TechnologyCategory,
			key,
			label: technologyCategory.get(key).label,
		}));
	}

	/** Upserts a single concept. Callers must hold the lock for `ref` (see `lockConcepts`). */
	async upsertConcept(prisma: Prisma.TransactionClient, ref: ConceptRef): Promise<Concept> {
		const concept = await prisma.concept.upsert({
			where: { vocabulary_key: { vocabulary: ref.vocabulary, key: ref.key } },
			create: ref,
			update: { label: ref.label, embeddingRevision: { increment: 1 } },
		});

		await this.linkOntologyHierarchy(prisma, ref, concept.id);

		return concept;
	}

	/**
	 * Mirrors the ontology's parent chain into `ConceptRelation` as `broader` edges.
	 *
	 * This is what lets a `React` skill answer a "UI framework" requirement: the
	 * matcher walks `broader` rather than needing every requirement to name a leaf.
	 * Ancestor concepts are created but never enqueued for embedding — they are
	 * structural, and their labels come from the authored vocabulary, so they
	 * carry no user text worth vectorizing.
	 *
	 * Public so the backfill script can reach concepts that predate hierarchy
	 * mirroring without going through `upsertConcept`, which would bump their
	 * embedding revision and mark every one of them stale for no reason.
	 * Callers must hold the lock for `ref` and its ancestors (see `lockConcepts`).
	 */
	async linkOntologyHierarchy(
		prisma: Prisma.TransactionClient,
		ref: ConceptRef,
		conceptId: string,
	): Promise<void> {
		let sourceConceptId = conceptId;

		for (const ancestor of this.ontologyAncestors(ref)) {
			const parent = await prisma.concept.upsert({
				where: {
					vocabulary_key: { vocabulary: ancestor.vocabulary, key: ancestor.key },
				},
				create: ancestor,
				update: {},
			});

			await prisma.conceptRelation.upsert({
				where: {
					sourceConceptId_targetConceptId_relation: {
						sourceConceptId,
						targetConceptId: parent.id,
						relation: BROADER,
					},
				},
				create: {
					sourceConceptId,
					targetConceptId: parent.id,
					relation: BROADER,
					source: 'ontology',
				},
				update: {},
			});

			sourceConceptId = parent.id;
		}
	}

	/**
	 * Canonicalizes a free-text label against the technology lexicon.
	 *
	 * Sync and DB-free: the lexicon is the one authority that answers without a
	 * round trip, and it is the tier that closes the `k8s` → `Kubernetes` and
	 * `React.js` → `React` gaps that string comparison never could.
	 */
	resolveTechnologyLabel(label: string): ConceptRef | undefined {
		const record = technology.resolve(label);

		if (record === undefined) {
			return undefined;
		}

		return {
			vocabulary: ConceptVocabulary.Technology,
			key: record.name,
			label: record.name,
		};
	}

	/**
	 * Resolves free-text labels to concept identities.
	 *
	 * Three tiers, tried in order: the technology lexicon, the learned alias
	 * table, then concepts already in the graph under a resolvable vocabulary.
	 *
	 * A label matching nothing stays unresolved rather than minting a concept.
	 * Minting would make every typo and one-off internal tool a graph citizen
	 * that can never match a requirement, whereas an unresolved label is still
	 * readable text on the resume — and the unresolved list is a usable backlog.
	 */
	async resolveLabels(
		labels: readonly string[],
		client: Prisma.TransactionClient | PrismaService = this.prisma,
	): Promise<LabelResolution> {
		// Fold to `tightKey` for identity so `Node.js` and `NodeJS` in the same
		// list collapse to one lookup, but carry the author's spelling forward:
		// it is what gets recorded as an alias.
		const pending = new Map<string, string>();
		for (const raw of labels) {
			const label = raw.trim();
			const normalized = tightKey(label);

			if (label && normalized && !pending.has(normalized)) {
				pending.set(normalized, label);
			}
		}

		const resolved: ResolvedLabel[] = [];

		for (const [normalized, label] of [...pending.entries()]) {
			const concept = this.resolveTechnologyLabel(label);

			if (concept) {
				resolved.push({ label, concept });
				pending.delete(normalized);
			}
		}

		if (pending.size > 0) {
			const aliases = await client.conceptAlias.findMany({
				where: { normalizedLabel: { in: [...pending.keys()] } },
				include: { concept: true },
			});

			for (const alias of aliases) {
				const label = pending.get(alias.normalizedLabel);

				if (label) {
					pending.delete(alias.normalizedLabel);
					resolved.push({
						label,
						concept: {
							vocabulary: alias.concept.vocabulary,
							key: alias.concept.key,
							label: alias.concept.label,
						},
					});
				}
			}
		}

		if (pending.size > 0) {
			const candidates = await client.concept.findMany({
				where: {
					vocabulary: { in: [...RESOLVABLE_VOCABULARIES] },
					key: { in: [...pending.values()].map(looseKey).filter(Boolean) },
				},
			});
			// Ties go to the vocabulary listed first in RESOLVABLE_VOCABULARIES.
			const ranked = [...candidates].sort(
				(left, right) =>
					RESOLVABLE_VOCABULARIES.indexOf(left.vocabulary) -
					RESOLVABLE_VOCABULARIES.indexOf(right.vocabulary),
			);

			for (const candidate of ranked) {
				const normalized = tightKey(candidate.key);
				const label = pending.get(normalized);

				if (label) {
					pending.delete(normalized);
					resolved.push({
						label,
						concept: {
							vocabulary: candidate.vocabulary,
							key: candidate.key,
							label: candidate.label,
						},
					});
				}
			}
		}

		return { resolved, unresolved: [...pending.values()] };
	}

	/**
	 * Resolves labels, persists the concepts they name, and records the author's
	 * spellings as aliases.
	 *
	 * The single seam every entity write path uses to turn a free-text list into
	 * concept rows it can hang edges off. Locking covers ontology ancestors too,
	 * so it is safe to call concurrently for entities sharing a technology.
	 */
	async materializeLabels(
		prisma: Prisma.TransactionClient,
		labels: readonly string[],
	): Promise<MaterializedLabels> {
		// Resolved on the transaction's own connection: reading through the
		// pooled client while this transaction holds one would take a second
		// connection for no benefit, and would not see its uncommitted writes.
		const { resolved, unresolved } = await this.resolveLabels(labels, prisma);

		if (resolved.length === 0) {
			return { concepts: [], unresolved };
		}

		await this.lockConcepts(
			prisma,
			resolved.map(({ concept }) => concept),
		);

		const concepts: Concept[] = [];
		const seen = new Set<string>();

		for (const { label, concept: ref } of resolved) {
			const identity = `${ref.vocabulary}:${ref.key}`;
			const concept = await this.upsertConcept(prisma, ref);

			await this.recordAlias(prisma, concept, label);

			if (!seen.has(identity)) {
				seen.add(identity);
				concepts.push(concept);
			}
		}

		return { concepts, unresolved };
	}

	/**
	 * Resolves labels to persisted concept ids, plus the ids of every concept the
	 * ontology places above them.
	 *
	 * Read-only, unlike `materializeLabels` — safe on a query path. A label
	 * resolving to a concept nobody has persisted returns nothing, which costs
	 * the caller no matches: requirements only ever reference concepts that
	 * exist, so an unpersisted concept could not have matched anyway.
	 *
	 * The ancestor ids are what make indirect matching work. A resume listing
	 * `React` answers a requirement for "web platform development software"
	 * without either side having to name the other.
	 */
	async resolveLabelConcepts(labels: readonly string[]): Promise<ResolvedLabelConcepts[]> {
		const { resolved } = await this.resolveLabels(labels);

		if (resolved.length === 0) {
			return [];
		}

		const persisted = await this.prisma.concept.findMany({
			where: {
				OR: resolved.map(({ concept }) => ({
					vocabulary: concept.vocabulary,
					key: concept.key,
				})),
			},
			select: { id: true, vocabulary: true, key: true },
		});
		const idByIdentity = new Map(
			persisted.map((concept) => [`${concept.vocabulary}:${concept.key}`, concept.id]),
		);

		const broaderByConceptId = await this.findBroaderClosure(persisted.map(({ id }) => id));

		return resolved.flatMap(({ label, concept }) => {
			const conceptId = idByIdentity.get(`${concept.vocabulary}:${concept.key}`);

			return conceptId
				? [
						{
							label,
							conceptId,
							broaderConceptIds: [...(broaderByConceptId.get(conceptId) ?? [])],
						},
					]
				: [];
		});
	}

	/**
	 * Walks `broader` edges upward from each id, returning every ancestor reached.
	 *
	 * Iterative rather than a recursive CTE because the authored hierarchy is two
	 * levels deep; the visited set bounds it regardless, so a cycle introduced by
	 * a future non-ontology relation cannot hang the query.
	 */
	async findBroaderClosure(
		conceptIds: readonly string[],
	): Promise<Map<string, Set<string>>> {
		const closure = new Map<string, Set<string>>(
			conceptIds.map((id) => [id, new Set<string>()]),
		);
		let frontier = new Map<string, Set<string>>(conceptIds.map((id) => [id, new Set([id])]));

		while (frontier.size > 0) {
			const edges = await this.prisma.conceptRelation.findMany({
				where: { sourceConceptId: { in: [...frontier.keys()] }, relation: BROADER },
				select: { sourceConceptId: true, targetConceptId: true },
			});
			const next = new Map<string, Set<string>>();

			for (const edge of edges) {
				for (const origin of frontier.get(edge.sourceConceptId) ?? []) {
					const reached = closure.get(origin);

					if (!reached || reached.has(edge.targetConceptId)) {
						continue;
					}

					reached.add(edge.targetConceptId);
					const pending = next.get(edge.targetConceptId);

					if (pending) {
						pending.add(origin);
					} else {
						next.set(edge.targetConceptId, new Set([origin]));
					}
				}
			}

			frontier = next;
		}

		return closure;
	}

	/**
	 * Records `label` as an alias of `concept` when it is a different spelling.
	 *
	 * Turns resolution into a cache: the next lookup of `k8s` hits the alias tier
	 * instead of re-deriving it, and aliases learned from one user's phrasing
	 * become matchable for everyone. Exact restatements of the canonical label
	 * are skipped — they carry no information.
	 */
	async recordAlias(
		prisma: Prisma.TransactionClient,
		concept: Concept,
		label: string,
	): Promise<void> {
		const normalizedLabel = tightKey(label);

		if (!normalizedLabel || normalizedLabel === tightKey(concept.label)) {
			return;
		}

		await prisma.conceptAlias.upsert({
			where: { conceptId_normalizedLabel: { conceptId: concept.id, normalizedLabel } },
			create: { conceptId: concept.id, label, normalizedLabel },
			update: {},
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
					{ skills: { some: { skill: { uid } } } },
					{ projects: { some: { project: { uid } } } },
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
           OR EXISTS (
             SELECT 1
             FROM "${SCHEMA}"."SkillConcept" sc
             JOIN "${SCHEMA}"."Skill" s ON s.id = sc."skillId"
             WHERE sc."conceptId" = c.id AND s.uid = $2
           )
           OR EXISTS (
             SELECT 1
             FROM "${SCHEMA}"."ProjectConcept" pc
             JOIN "${SCHEMA}"."Project" p ON p.id = pc."projectId"
             WHERE pc."conceptId" = c.id AND p.uid = $2
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
