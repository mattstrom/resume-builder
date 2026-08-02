import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { technology, technologyCategory } from '@resume-builder/ontologies';

import type { Expression, Fact, Prisma, ResumeFact } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/index.js';
import { EmbeddingService } from './embedding.service.js';

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

export enum ConceptVocabulary {
	FactType = 'fact-type',
	Entity = 'entity',
	Topic = 'topic',
	Technology = 'technology',
	Capability = 'capability',
	Outcome = 'outcome',
	Artifact = 'artifact',
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

export interface FactConceptReferenceDto {
	vocabulary: ConceptVocabulary;
	key: string;
	label: string;
}

export interface FactMeaningDto {
	relation: FactRelation;
	concept: FactConceptReferenceDto;
	source?: string;
	confidence?: number | null;
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

@Injectable()
export class FactsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly embedding: EmbeddingService,
	) {}

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

	private async lockConcepts(
		prisma: Prisma.TransactionClient,
		concepts: FactConceptReferenceDto[],
	): Promise<void> {
		const identities = new Map(
			concepts.map((concept) => [`${concept.vocabulary}:${concept.key}`, concept]),
		);

		// Prisma upserts can race when separate transactions create the same compound
		// unique key. Transaction-scoped advisory locks serialize each concept key.
		// Sorting prevents deadlocks when two facts share several concepts.
		for (const [, concept] of [...identities.entries()].sort(([left], [right]) =>
			left.localeCompare(right),
		)) {
			await prisma.$queryRawUnsafe(
				'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
				concept.vocabulary,
				concept.key,
			);
		}
	}

	private async replaceMeanings(
		prisma: Prisma.TransactionClient,
		factId: string,
		meanings: FactMeaningDto[],
	): Promise<void> {
		this.validateMeanings(meanings);
		const normalized = meanings.map((meaning) => this.normalizeMeaning(meaning));
		await this.lockConcepts(
			prisma,
			normalized.map((meaning) => meaning.concept),
		);
		await prisma.factConcept.deleteMany({ where: { factId } });

		const seen = new Set<string>();
		for (const meaning of normalized) {
			const identity = `${meaning.relation}:${meaning.concept.vocabulary}:${meaning.concept.key}`;
			if (seen.has(identity)) continue;
			seen.add(identity);
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

			await prisma.factConcept.create({
				data: {
					factId,
					conceptId: concept.id,
					relation: meaning.relation,
					source: meaning.source,
					confidence: meaning.confidence,
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
		const vector = await this.embedding.embed(this.factToEmbeddingText(fact));
		await this.setEmbedding(uid, fact.id, vector);

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
			await prisma.fact.update({ where: { id }, data });
			if (meanings !== undefined) {
				await this.replaceMeanings(prisma, id, meanings);
			}
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
				OR: [
					{ facts: { some: { fact: { uid } } } },
					{ bullets: { some: { bullet: { uid } } } },
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

	async upsertFactConcept(
		uid: string,
		factId: string,
		meaning: FactMeaningDto,
	): Promise<FactConceptWithConcept> {
		await this.findById(uid, factId);
		const normalized = this.normalizeMeaning(meaning);
		return this.prisma.$transaction(async (prisma) => {
			await this.lockConcepts(prisma, [normalized.concept]);
			if (normalized.relation === FactRelation.IsA) {
				await prisma.factConcept.deleteMany({
					where: { factId, relation: FactRelation.IsA },
				});
			}

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

			return prisma.factConcept.upsert({
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
		});
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
