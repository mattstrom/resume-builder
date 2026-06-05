import { Injectable, NotFoundException } from '@nestjs/common';

import type { Expression, Fact, ResumeFact } from '../../generated/prisma/client.js';
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

export interface SimilarFact extends FactWithoutEmbedding {
	distance: number;
}

@Injectable()
export class FactsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly embedding: EmbeddingService,
	) {}

	// ─── Facts ────────────────────────────────────────────────────────────────

	async create(uid: string, dto: CreateFactDto): Promise<FactWithoutEmbedding> {
		const fact = await this.prisma.fact.create({
			data: {
				uid,
				kind: dto.kind,
				entityType: dto.entityType,
				entityId: dto.entityId,
				what: dto.what,
				impact: dto.impact,
				scale: dto.scale,
				tags: dto.tags ?? [],
				technologies: dto.technologies ?? [],
			},
		});

		const vector = await this.embedding.embed(this.factToEmbeddingText(fact));
		await this.setEmbedding(uid, fact.id, vector);

		return fact;
	}

	async findAll(uid: string, filters: FactFilters = {}): Promise<FactWithoutEmbedding[]> {
		return this.prisma.fact.findMany({
			where: {
				uid,
				...(filters.kind ? { kind: filters.kind } : {}),
				...(filters.entityType ? { entityType: filters.entityType } : {}),
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

	async findByIds(uid: string, ids: string[]): Promise<FactWithoutEmbedding[]> {
		return this.prisma.fact.findMany({ where: { id: { in: ids }, uid } });
	}

	async update(uid: string, id: string, dto: UpdateFactDto): Promise<FactWithoutEmbedding> {
		await this.findById(uid, id);

		const fact = await this.prisma.fact.update({ where: { id }, data: dto });

		const vector = await this.embedding.embed(this.factToEmbeddingText(fact));
		await this.setEmbedding(uid, fact.id, vector);

		return fact;
	}

	async delete(uid: string, id: string): Promise<void> {
		await this.findById(uid, id);
		await this.prisma.fact.delete({ where: { id } });
	}

	// ─── Embeddings ───────────────────────────────────────────────────────────

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
		const rows = await this.prisma.$queryRawUnsafe<SimilarFact[]>(
			`SELECT id, uid, kind, "entityType", "entityId", what, impact, scale, tags, technologies, "createdAt",
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
			data: { factId, text: dto.text, length: dto.length, tone: dto.tone },
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
		const expr = await this.prisma.expression.findFirst({ where: { id, factId } });
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
		await this.prisma.resumeFact.delete({ where: { resumeId_factId: { resumeId, factId } } });
	}
}
