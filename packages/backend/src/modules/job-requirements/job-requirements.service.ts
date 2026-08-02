import { Injectable, NotFoundException } from '@nestjs/common';

import type { JobRequirementFact, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/index.js';
import { jobRequirementEmbeddingText } from '../queue/embeddings/embedding-documents.js';
import { EmbeddingQueueService } from '../queue/embeddings/embedding-queue.service.js';
import { EMBEDDING_MODEL, EMBEDDING_PROFILES } from '../queue/embeddings/embedding.constants.js';

const SCHEMA = 'resume_builder';

export type JobRequirementFactWithoutEmbedding = Omit<JobRequirementFact, 'embedding'>;

export interface CreateJobRequirementDto {
	kind: string;
	what: string;
	technologies?: string[];
	tags?: string[];
}

export interface SimilarJobRequirement extends JobRequirementFactWithoutEmbedding {
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
	) {}

	async create(
		uid: string,
		applicationId: string,
		dtos: CreateJobRequirementDto[],
	): Promise<JobRequirementFactWithoutEmbedding[]> {
		const created = await Promise.all(
			dtos.map((dto) =>
				this.prisma.jobRequirementFact.create({
					data: {
						uid,
						applicationId,
						kind: dto.kind,
						what: dto.what,
						technologies: dto.technologies ?? [],
						tags: dto.tags ?? [],
					},
				}),
			),
		);

		await this.embeddingQueue.enqueueMany(
			created.map((requirement) => ({
				entityType: 'job-requirement' as const,
				entityId: requirement.id,
				revision: requirement.embeddingRevision,
				profile: EMBEDDING_PROFILES['job-requirement'],
			})),
		);

		return created;
	}

	async findById(id: string): Promise<JobRequirementFactWithoutEmbedding> {
		const row = await this.prisma.jobRequirementFact.findUnique({ where: { id } });
		if (!row) throw new NotFoundException(`JobRequirementFact ${id} not found`);
		return row;
	}

	async findByIds(ids: string[]): Promise<JobRequirementFactWithoutEmbedding[]> {
		return this.prisma.jobRequirementFact.findMany({ where: { id: { in: ids } } });
	}

	async findByApplication(
		uid: string,
		applicationId: string,
	): Promise<JobRequirementFactWithoutEmbedding[]> {
		return this.prisma.jobRequirementFact.findMany({
			where: { uid, applicationId },
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

		if (!rows[0]?.embedding) {
			return [];
		}

		const facts = await this.prisma.$queryRawUnsafe<
			Array<Omit<CareerFactWithConcepts, 'concepts'> & { distance: number }>
		>(
			`SELECT id, uid, what, impact, scale, citation, "citationNodeIndex", "createdAt",
              embedding <=> $1::vector AS distance
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
