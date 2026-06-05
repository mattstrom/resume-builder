import { Injectable, NotFoundException } from '@nestjs/common';

import type { JobRequirementFact } from '../../generated/prisma/client.js';
import { EmbeddingService } from '../facts/embedding.service.js';
import { PrismaService } from '../prisma/index.js';

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

@Injectable()
export class JobRequirementsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly embedding: EmbeddingService,
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

		await Promise.all(
			created.map(async (req) => {
				const vector = await this.embedding.embed(this.requirementToEmbeddingText(req));
				await this.setEmbedding(req.id, vector);
			}),
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
	): Promise<
		{
			id: string;
			uid: string;
			kind: string;
			what: string;
			impact: string | null;
			scale: string | null;
			tags: string[];
			technologies: string[];
			entityType: string | null;
			entityId: string | null;
			createdAt: Date;
			distance: number;
		}[]
	> {
		const rows = await this.prisma.$queryRawUnsafe<{ embedding: string }[]>(
			`SELECT embedding::text FROM "${SCHEMA}"."JobRequirementFact" WHERE id = $1`,
			id,
		);

		if (!rows[0]?.embedding) {
			return [];
		}

		return this.prisma.$queryRawUnsafe(
			`SELECT id, uid, kind, "entityType", "entityId", what, impact, scale, tags, technologies, "createdAt",
              embedding <=> $1::vector AS distance
       FROM "${SCHEMA}"."Fact"
       WHERE uid = $2 AND embedding IS NOT NULL
       ORDER BY distance
       LIMIT $3`,
			rows[0].embedding,
			uid,
			limit,
		);
	}

	requirementToEmbeddingText(req: {
		what: string;
		tags: string[];
		technologies: string[];
	}): string {
		const parts = [req.what];
		if (req.tags.length) parts.push(req.tags.join(', '));
		if (req.technologies.length) parts.push(req.technologies.join(', '));
		return parts.join('\n');
	}

	private async setEmbedding(id: string, vector: number[]): Promise<void> {
		const formatted = `[${vector.join(',')}]`;
		await this.prisma.$executeRawUnsafe(
			`UPDATE "${SCHEMA}"."JobRequirementFact" SET embedding = $1::${SCHEMA}.vector WHERE id = $2`,
			formatted,
			id,
		);
	}
}
