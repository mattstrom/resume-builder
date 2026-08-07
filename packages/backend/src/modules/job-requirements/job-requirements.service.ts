import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { conceptQualifierSchema, type ConceptQualifierValue } from '@resume-builder/entities';
import { technology } from '@resume-builder/ontologies';

import type { Prisma } from '../../generated/prisma/client.js';
import { type ConceptRef, ConceptsService } from '../concepts/concepts.service.js';
import { PrismaService } from '../prisma/index.js';
import { jobRequirementEmbeddingText } from '../queue/embeddings/embedding-documents.js';
import { EmbeddingQueueService } from '../queue/embeddings/embedding-queue.service.js';
import { EMBEDDING_MODEL, EMBEDDING_PROFILES } from '../queue/embeddings/embedding.constants.js';

const SCHEMA = 'resume_builder';

export const JOB_REQUIREMENT_RELATIONS = ['requires', 'prefers', 'expects'] as const;
export type JobRequirementRelation = (typeof JOB_REQUIREMENT_RELATIONS)[number];

const JOB_CONCEPT_VOCABULARIES = new Set([
	'topic',
	'technology',
	'capability',
	'outcome',
	'artifact',
]);

export interface JobRequirementMeaningDto {
	relation: JobRequirementRelation;
	concept: ConceptRef;
	source?: string;
	confidence?: number | null;
	qualifier?: ConceptQualifierValue | null;
}

export interface CreateJobRequirementDto {
	kind: string;
	what: string;
	technologies?: string[];
	tags?: string[];
	meanings?: JobRequirementMeaningDto[];
}

export type JobRequirementWithConcepts = Prisma.JobRequirementFactGetPayload<{
	include: { concepts: { include: { concept: true } } };
}>;

export interface SimilarJobRequirement extends Omit<JobRequirementWithConcepts, 'concepts'> {
	distance: number;
}

type CareerFactWithConcepts = Prisma.FactGetPayload<{
	include: { concepts: { include: { concept: true } } };
}>;

@Injectable()
export class JobRequirementsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly embeddingQueue: EmbeddingQueueService,
		private readonly conceptsService: ConceptsService,
	) {}

	private conceptKey(label: string): string {
		return label
			.trim()
			.toLocaleLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/(^-|-$)/g, '');
	}

	private normalizeMeaning(
		meaning: JobRequirementMeaningDto,
	): Required<JobRequirementMeaningDto> {
		if (!JOB_REQUIREMENT_RELATIONS.includes(meaning.relation)) {
			throw new BadRequestException(`Unknown job requirement relation: ${meaning.relation}`);
		}
		if (!JOB_CONCEPT_VOCABULARIES.has(meaning.concept.vocabulary)) {
			throw new BadRequestException(
				`Job requirements cannot target the ${meaning.concept.vocabulary} vocabulary`,
			);
		}

		const suppliedKey = meaning.concept.key.trim();
		const suppliedLabel = meaning.concept.label.trim();
		if (!suppliedKey || !suppliedLabel) {
			throw new BadRequestException('Concept keys and labels cannot be empty');
		}

		let key = suppliedKey;
		let label = suppliedLabel;
		if (meaning.concept.vocabulary === 'technology') {
			const record = technology.resolve(suppliedLabel) ?? technology.resolve(suppliedKey);
			key = record?.name ?? suppliedKey;
			label = record?.name ?? suppliedLabel;
		} else {
			key = this.conceptKey(suppliedKey);
		}

		const confidence = meaning.confidence ?? null;
		if (confidence !== null && (confidence < 0 || confidence > 1)) {
			throw new BadRequestException('Meaning confidence must be between 0 and 1');
		}

		return {
			relation: meaning.relation,
			concept: { vocabulary: meaning.concept.vocabulary, key, label },
			source: meaning.source?.trim() || 'classifier',
			confidence,
			qualifier: meaning.qualifier ? conceptQualifierSchema.parse(meaning.qualifier) : null,
		};
	}

	private async persist(
		uid: string,
		applicationId: string,
		dtos: CreateJobRequirementDto[],
		replace: boolean,
	): Promise<JobRequirementWithConcepts[]> {
		const normalized = dtos.map((dto) => ({
			...dto,
			meanings: (dto.meanings ?? []).map((meaning) => this.normalizeMeaning(meaning)),
		}));

		const created = await this.prisma.$transaction(async (prisma) => {
			if (replace) {
				await prisma.jobRequirementFact.deleteMany({ where: { uid, applicationId } });
			}

			await this.conceptsService.lockConcepts(
				prisma,
				normalized.flatMap((dto) => dto.meanings.map(({ concept }) => concept)),
			);

			const requirements: JobRequirementWithConcepts[] = [];
			for (const dto of normalized) {
				const technologies = dto.meanings
					.filter(({ concept }) => concept.vocabulary === 'technology')
					.map(({ concept }) => concept.label);
				const tags = dto.meanings
					.filter(({ concept }) => concept.vocabulary !== 'technology')
					.map(({ concept }) => concept.key);
				const requirement = await prisma.jobRequirementFact.create({
					data: {
						uid,
						applicationId,
						kind: dto.kind,
						what: dto.what,
						technologies:
							technologies.length > 0 ? technologies : (dto.technologies ?? []),
						tags: tags.length > 0 ? tags : (dto.tags ?? []),
					},
				});

				const seen = new Set<string>();
				for (const meaning of dto.meanings) {
					const identity = `${meaning.relation}:${meaning.concept.vocabulary}:${meaning.concept.key}`;
					if (seen.has(identity)) continue;
					seen.add(identity);

					const concept = await this.conceptsService.upsertConcept(
						prisma,
						meaning.concept,
					);
					await prisma.jobRequirementConcept.create({
						data: {
							jobRequirementId: requirement.id,
							conceptId: concept.id,
							relation: meaning.relation,
							source: meaning.source,
							confidence: meaning.confidence,
							qualifier: meaning.qualifier ?? undefined,
						},
					});
				}

				requirements.push(
					await prisma.jobRequirementFact.findUniqueOrThrow({
						where: { id: requirement.id },
						include: { concepts: { include: { concept: true } } },
					}),
				);
			}

			return requirements;
		});

		await Promise.all([
			this.embeddingQueue.enqueueMany(
				created.map((requirement) => ({
					entityType: 'job-requirement' as const,
					entityId: requirement.id,
					revision: requirement.embeddingRevision,
					profile: EMBEDDING_PROFILES['job-requirement'],
				})),
			),
			this.conceptsService.enqueueConcepts(
				created.flatMap((requirement) =>
					requirement.concepts.map(({ concept }) => concept),
				),
			),
		]);

		return created;
	}

	async create(
		uid: string,
		applicationId: string,
		dtos: CreateJobRequirementDto[],
	): Promise<JobRequirementWithConcepts[]> {
		return this.persist(uid, applicationId, dtos, false);
	}

	async replace(
		uid: string,
		applicationId: string,
		dtos: CreateJobRequirementDto[],
	): Promise<JobRequirementWithConcepts[]> {
		return this.persist(uid, applicationId, dtos, true);
	}

	async findById(id: string): Promise<JobRequirementWithConcepts> {
		const row = await this.prisma.jobRequirementFact.findUnique({
			where: { id },
			include: { concepts: { include: { concept: true } } },
		});
		if (!row) throw new NotFoundException(`JobRequirementFact ${id} not found`);
		return row;
	}

	async findByIds(ids: string[]): Promise<JobRequirementWithConcepts[]> {
		return this.prisma.jobRequirementFact.findMany({
			where: { id: { in: ids } },
			include: { concepts: { include: { concept: true } } },
		});
	}

	async findByApplication(
		uid: string,
		applicationId: string,
	): Promise<JobRequirementWithConcepts[]> {
		return this.prisma.jobRequirementFact.findMany({
			where: { uid, applicationId },
			include: { concepts: { include: { concept: true } } },
			orderBy: { createdAt: 'asc' },
		});
	}

	async findSimilarToRequirement(
		id: string,
		uid: string,
		limit = 10,
	): Promise<Array<CareerFactWithConcepts & { distance: number }>> {
		const rows = await this.prisma.$queryRawUnsafe<{ embedding: string }[]>(
			`SELECT embedding::text
       FROM "${SCHEMA}"."JobRequirementFact"
       WHERE id = $1
         AND "embeddedRevision" = "embeddingRevision"
         AND "embeddingModel" = $2
         AND "embeddingProfile" = $3`,
			id,
			EMBEDDING_MODEL,
			EMBEDDING_PROFILES['job-requirement'],
		);

		if (!rows[0]?.embedding) return [];

		const facts = await this.prisma.$queryRawUnsafe<
			Array<Omit<CareerFactWithConcepts, 'concepts'> & { distance: number }>
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
			rows[0].embedding,
			uid,
			limit,
			EMBEDDING_MODEL,
			EMBEDDING_PROFILES.fact,
		);
		const conceptLinks = await this.prisma.factConcept.findMany({
			where: { factId: { in: facts.map((fact) => fact.id) } },
			include: { concept: true },
		});
		return facts.map((fact) => ({
			...fact,
			concepts: conceptLinks.filter((link) => link.factId === fact.id),
		}));
	}

	requirementToEmbeddingText(req: {
		what: string;
		tags: string[];
		technologies: string[];
	}): string {
		return jobRequirementEmbeddingText(req);
	}
}
