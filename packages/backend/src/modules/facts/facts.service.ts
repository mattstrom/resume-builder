import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { technology, technologyCategory } from '@resume-builder/ontologies';

import type { Expression, Fact, Prisma, ResumeFact } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/index.js';
import { EmbeddingService } from './embedding.service.js';

const SCHEMA = 'resume_builder';

export type FactWithoutEmbedding = Omit<Fact, 'embedding'>;

export interface CreateFactDto {
	kind: string;
	entityType?: string | null;
	entityId?: string | null;
	what: string;
	impact?: string | null;
	scale?: string | null;
	citation?: string | null;
	citationNodeIndex?: number | null;
	tags?: string[];
	technologies?: string[];
}

export interface UpdateFactDto {
	kind?: string;
	entityType?: string | null;
	entityId?: string | null;
	what?: string;
	impact?: string | null;
	scale?: string | null;
	citation?: string | null;
	citationNodeIndex?: number | null;
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

export interface ConceptSuggestion {
	vocabulary: string;
	key: string;
	label: string;
	definition?: string | null;
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

interface ConceptValue {
	key: string;
	label: string;
	source: string;
	confidence: number | null;
}

@Injectable()
export class FactsService {
	private readonly logger = new Logger(FactsService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly embedding: EmbeddingService,
	) {}

	/**
	 * Collapse technology spellings onto their canonical names before creating
	 * their semantic concept relationships.
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
			this.logger.log(`[technology-normalization] unrecognized: ${unrecognized.join(', ')}`);
		}

		return output;
	}

	private conceptKey(label: string): string {
		return label
			.trim()
			.toLocaleLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/(^-|-$)/g, '');
	}

	private entityKey(entityType?: string | null, entityId?: string | null): string | undefined {
		const type = entityType?.trim().toLocaleLowerCase();
		const id = entityId?.trim();
		if (!type && !id) return undefined;
		return `${type || 'unknown'}:${id || '*'}`;
	}

	private entityParts(concepts: FactConceptWithConcept[]): {
		entityType?: string;
		entityId?: string;
	} {
		const entity = concepts.find(
			(link) => link.relation === 'relates-to' && link.concept.vocabulary === 'entity',
		);
		if (!entity) return {};
		const separator = entity.concept.key.indexOf(':');
		if (separator < 0) return { entityId: entity.concept.key };
		const entityType = entity.concept.key.slice(0, separator);
		const entityId = entity.concept.key.slice(separator + 1);
		return {
			entityType: entityType === 'unknown' ? undefined : entityType,
			entityId: entityId === '*' ? undefined : entityId,
		};
	}

	private async replaceConcepts(
		prisma: Prisma.TransactionClient,
		factId: string,
		relation: string,
		vocabulary: string,
		values: ConceptValue[],
	): Promise<void> {
		await prisma.factConcept.deleteMany({
			where: {
				factId,
				relation,
				concept: { vocabulary },
			},
		});

		const seen = new Set<string>();
		for (const value of values) {
			if (!value.key || seen.has(value.key)) continue;
			seen.add(value.key);
			const concept = await prisma.concept.upsert({
				where: {
					vocabulary_key: { vocabulary, key: value.key },
				},
				create: { vocabulary, key: value.key, label: value.label },
				update: {},
			});

			await prisma.factConcept.create({
				data: {
					factId,
					conceptId: concept.id,
					relation,
					source: value.source,
					confidence: value.confidence,
				},
			});
		}
	}

	private async syncInputConcepts(
		prisma: Prisma.TransactionClient,
		factId: string,
		dto: CreateFactDto | UpdateFactDto,
		currentConcepts: FactConceptWithConcept[] = [],
		creating = false,
	): Promise<void> {
		if (creating || dto.kind !== undefined) {
			const label = dto.kind?.trim() ?? '';
			await this.replaceConcepts(
				prisma,
				factId,
				'is-a',
				'fact-type',
				label
					? [{ key: this.conceptKey(label), label, source: 'user', confidence: 1 }]
					: [],
			);
		}

		if (creating || dto.tags !== undefined) {
			const topics = (dto.tags ?? []).map((label) => ({
				key: this.conceptKey(label),
				label: label.trim(),
				source: 'user',
				confidence: 1,
			}));
			await this.replaceConcepts(prisma, factId, 'about', 'topic', topics);
		}

		if (creating || dto.technologies !== undefined) {
			const technologies = this.canonicalizeTechnologies(dto.technologies ?? []);
			await this.replaceConcepts(
				prisma,
				factId,
				'uses',
				'technology',
				technologies.map((name) => {
					const recognized = technology.resolve(name) !== undefined;
					return {
						key: name,
						label: name,
						source: recognized ? 'ontology-normalizer' : 'user',
						confidence: recognized ? 1 : null,
					};
				}),
			);
		}

		if (creating || dto.entityType !== undefined || dto.entityId !== undefined) {
			const current = this.entityParts(currentConcepts);
			const entityType = dto.entityType === undefined ? current.entityType : dto.entityType;
			const entityId = dto.entityId === undefined ? current.entityId : dto.entityId;
			const key = this.entityKey(entityType, entityId);
			await this.replaceConcepts(
				prisma,
				factId,
				'relates-to',
				'entity',
				key
					? [
							{
								key,
								label: entityId?.trim() || entityType?.trim() || 'Unknown entity',
								source: 'user',
								confidence: 1,
							},
						]
					: [],
			);
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

			await this.syncInputConcepts(prisma, created.id, dto, [], true);
			return created;
		});

		const fact = await this.findById(uid, created.id);
		const vector = await this.embedding.embed(this.factToEmbeddingText(fact));
		await this.setEmbedding(uid, fact.id, vector);

		return fact;
	}

	async findAll(uid: string, filters: FactFilters = {}): Promise<FactWithConcepts[]> {
		const semanticFilters: Prisma.FactWhereInput[] = [];
		if (filters.kind) {
			semanticFilters.push({
				concepts: {
					some: {
						relation: 'is-a',
						concept: {
							vocabulary: 'fact-type',
							key: this.conceptKey(filters.kind),
						},
					},
				},
			});
		}
		if (filters.entityType || filters.entityId) {
			const entityKey =
				filters.entityType && filters.entityId
					? this.entityKey(filters.entityType, filters.entityId)
					: undefined;
			semanticFilters.push({
				concepts: {
					some: {
						relation: 'relates-to',
						concept: {
							vocabulary: 'entity',
							key: entityKey
								? entityKey
								: filters.entityType
									? {
											startsWith: `${filters.entityType.trim().toLocaleLowerCase()}:`,
										}
									: { endsWith: `:${filters.entityId?.trim()}` },
						},
					},
				},
			});
		}

		return this.prisma.fact.findMany({
			where: {
				uid,
				...(semanticFilters.length ? { AND: semanticFilters } : {}),
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
		const current = await this.findById(uid, id);
		const { kind, entityType, entityId, tags, technologies, ...data } = dto;

		await this.prisma.$transaction(async (prisma) => {
			await prisma.fact.update({ where: { id }, data });
			await this.syncInputConcepts(
				prisma,
				id,
				{ kind, entityType, entityId, tags, technologies },
				current.concepts,
			);
		});

		const fact = await this.findById(uid, id);
		const vector = await this.embedding.embed(this.factToEmbeddingText(fact));
		await this.setEmbedding(uid, fact.id, vector);

		return fact;
	}

	async delete(uid: string, id: string): Promise<void> {
		await this.findById(uid, id);
		await this.prisma.fact.delete({ where: { id } });
	}

	// ─── Embeddings ───────────────────────────────────────────────────────────

	async findFactConcepts(uid: string, factId: string): Promise<FactConceptWithConcept[]> {
		await this.findById(uid, factId);
		return this.prisma.factConcept.findMany({
			where: { factId },
			include: { concept: true },
			orderBy: { createdAt: 'asc' },
		});
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
					if (left.name === exact) return -1;
					if (right.name === exact) return 1;
					const leftStarts = left.name.toLocaleLowerCase().startsWith(query);
					const rightStarts = right.name.toLocaleLowerCase().startsWith(query);
					if (leftStarts !== rightStarts) return leftStarts ? -1 : 1;
					if (left.hot !== right.hot) return left.hot ? -1 : 1;
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
				facts: { some: { fact: { uid } } },
				...(query
					? { label: { contains: search.trim(), mode: 'insensitive' as const } }
					: {}),
			},
			select: { vocabulary: true, key: true, label: true, definition: true },
			orderBy: { label: 'asc' },
			take: limit,
		});
	}

	async upsertFactConcept(
		uid: string,
		factId: string,
		dto: UpsertFactConceptDto,
	): Promise<FactConceptWithConcept> {
		await this.findById(uid, factId);
		const technologyRecord =
			dto.vocabulary === 'technology'
				? (technology.resolve(dto.label) ?? technology.resolve(dto.key))
				: undefined;
		const key = technologyRecord?.name ?? dto.key;
		const label = technologyRecord?.name ?? dto.label;
		return this.prisma.$transaction(async (prisma) => {
			const concept = await prisma.concept.upsert({
				where: {
					vocabulary_key: {
						vocabulary: dto.vocabulary,
						key,
					},
				},
				create: {
					vocabulary: dto.vocabulary,
					key,
					label,
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
		concepts: FactConceptWithConcept[];
	}): string {
		const parts = [fact.what];
		if (fact.impact) {
			parts.push(fact.impact);
		}

		if (fact.scale) {
			parts.push(fact.scale);
		}

		const semanticLabels = fact.concepts.map(
			(link) => `${link.relation}: ${link.concept.label}`,
		);
		if (semanticLabels.length) {
			parts.push(semanticLabels.join(', '));
		}

		return parts.join('\n');
	}

	async setEmbedding(uid: string, id: string, vector: number[]): Promise<void> {
		await this.findById(uid, id);
		const formatted = `[${vector.join(',')}]`;
		await this.prisma.$executeRawUnsafe(
			`UPDATE "${SCHEMA}"."Fact" SET embedding = $1::resume_builder.vector WHERE id = $2`,
			formatted,
			id,
		);
	}

	async findSimilar(uid: string, vector: number[], limit = 10): Promise<SimilarFact[]> {
		const formatted = `[${vector.join(',')}]`;
		const rows = await this.prisma.$queryRawUnsafe<
			Array<FactWithoutEmbedding & { distance: number }>
		>(
			`SELECT id, uid, what, impact, scale, citation, "citationNodeIndex", "createdAt",
              embedding <=> $1::vector AS distance
       FROM "${SCHEMA}"."Fact"
       WHERE uid = $2 AND embedding IS NOT NULL
       ORDER BY distance
       LIMIT $3`,
			formatted,
			uid,
			limit,
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
