import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Resolver, Tool, UseGuards } from '@nestjs-mcp/server';
import { FactSchema } from '@resume-builder/entities';
import { z } from 'zod';

import {
	ConceptVocabulary,
	type CreateFactDto,
	type FactMeaningDto,
	FactRelation,
	FactsService,
	type UpdateFactDto,
} from '../facts/facts.service.js';
import { EmbeddingService } from '../queue/embeddings/embedding.service.js';
import { McpGuard } from './mcp.guard.js';
import * as types from './types.js';
import { type McpToolParams } from './types.js';

const factEvidenceSchema = FactSchema.omit({
	id: true,
	uid: true,
	embeddingRevision: true,
	embeddedRevision: true,
	embeddingModel: true,
	embeddingProfile: true,
	createdAt: true,
});
const factMeaningSchema = z.object({
	relation: z.enum(FactRelation).describe('The semantic relationship from the fact'),
	concept: z.object({
		vocabulary: z.enum(ConceptVocabulary).describe('The controlled concept vocabulary'),
		key: z.string().min(1).describe('Stable, normalized concept key'),
		label: z.string().min(1).describe('Human-readable concept label'),
	}),
	source: z.string().optional().describe('Assertion provenance, such as extractor or user'),
	confidence: z.number().min(0).max(1).nullable().optional(),
});
const meaningsSchema = z
	.array(factMeaningSchema)
	.min(2)
	.describe('Complete semantic assertions for the fact, including its type and entity');
const factCreateSchema = factEvidenceSchema.extend({ meanings: meaningsSchema });
const factUpdateSchema = factEvidenceSchema
	.partial()
	.extend({ meanings: meaningsSchema.optional() });

@Resolver()
@UseGuards(McpGuard)
export class FactsResolver {
	constructor(
		private readonly factsService: FactsService,
		private readonly embeddingService: EmbeddingService,
	) {}

	@Tool({
		name: 'get_facts',
		description:
			'Retrieve facts for the current user, optionally filtered by a semantic relationship',
		paramsSchema: {
			relation: z.enum(FactRelation).optional(),
			vocabulary: z.enum(ConceptVocabulary).optional(),
			conceptKey: z.string().optional().describe('Exact stable concept key'),
		},
		annotations: { destructiveHint: false, idempotentHint: true },
	})
	async getFacts(
		filters: McpToolParams<{
			relation?: FactRelation;
			vocabulary?: ConceptVocabulary;
			conceptKey?: string;
		}>,
		{ user }: types.McpExtra,
	): Promise<CallToolResult> {
		const facts = await this.factsService.findAll(user.sub, filters);

		return {
			content: [{ type: 'text', text: `Found ${facts.length} facts.` }],
			structuredContent: { facts },
		};
	}

	@Tool({
		name: 'get_fact',
		description: 'Retrieve a single fact by ID',
		paramsSchema: { id: z.string().describe('Fact ID') },
		annotations: { destructiveHint: false, idempotentHint: true },
	})
	async getFact(
		{ id }: McpToolParams<{ id: string }>,
		{ user }: types.McpExtra,
	): Promise<CallToolResult> {
		const fact = await this.factsService.findById(user.sub, id);

		return {
			content: [{ type: 'text', text: `Found fact ${id}.` }],
			structuredContent: { fact },
		};
	}

	@Tool({
		name: 'find_similar_facts',
		description: "Semantic search over the current user's facts using a natural-language query",
		paramsSchema: {
			query: z.string().describe('Natural-language query to find semantically similar facts'),
			limit: z.number().int().min(1).max(50).optional().describe('Max results (default 10)'),
		},
		annotations: { destructiveHint: false, idempotentHint: true },
	})
	async findSimilarFacts(
		{ query, limit }: McpToolParams<{ query: string; limit?: number }>,
		{ user }: types.McpExtra,
	): Promise<CallToolResult> {
		const vector = await this.embeddingService.embed(query);
		const facts = await this.factsService.findSimilar(user.sub, vector, limit);

		return {
			content: [{ type: 'text', text: `Found ${facts.length} similar facts.` }],
			structuredContent: { facts },
		};
	}

	@Tool({
		name: 'create_facts',
		description:
			'Create atomic evidence records with their complete semantic meanings in one batch',
		paramsSchema: {
			facts: z.array(factCreateSchema).describe('List of facts to create'),
		},
		annotations: { destructiveHint: true, idempotentHint: false },
	})
	async createFacts(
		{ facts }: McpToolParams<{ facts: CreateFactDto[] }>,
		{ user }: types.McpExtra,
	): Promise<CallToolResult> {
		const created = await Promise.all(facts.map((f) => this.factsService.create(user.sub, f)));

		return {
			content: [{ type: 'text', text: `Created ${created.length} facts.` }],
			structuredContent: { facts: created },
		};
	}

	@Tool({
		name: 'update_fact',
		description:
			'Update fact evidence; when meanings are supplied they replace the complete semantic set',
		paramsSchema: {
			id: z.string().describe('Fact ID'),
			...factUpdateSchema.shape,
		},
		annotations: { destructiveHint: true, idempotentHint: false },
	})
	async updateFact(
		{ id, ...dto }: McpToolParams<{ id: string } & UpdateFactDto>,
		{ user }: types.McpExtra,
	): Promise<CallToolResult> {
		const fact = await this.factsService.update(user.sub, id, dto);

		return {
			content: [{ type: 'text', text: `Fact ${id} updated.` }],
			structuredContent: { fact },
		};
	}

	@Tool({
		name: 'delete_fact',
		description: 'Delete a fact and all its expressions',
		paramsSchema: { id: z.string().describe('Fact ID') },
		annotations: { destructiveHint: true, idempotentHint: false },
	})
	async deleteFact(
		{ id }: McpToolParams<{ id: string }>,
		{ user }: types.McpExtra,
	): Promise<CallToolResult> {
		await this.factsService.delete(user.sub, id);

		return {
			content: [{ type: 'text', text: `Fact ${id} deleted.` }],
		};
	}

	@Tool({
		name: 'get_fact_concepts',
		description: 'Get semantic concepts linked to a fact',
		paramsSchema: { factId: z.string().describe('Fact ID') },
		annotations: { destructiveHint: false, idempotentHint: true },
	})
	async getFactConcepts(
		{ factId }: McpToolParams<{ factId: string }>,
		{ user }: types.McpExtra,
	): Promise<CallToolResult> {
		const concepts = await this.factsService.findFactConcepts(user.sub, factId);

		return {
			content: [
				{
					type: 'text',
					text: `Found ${concepts.length} concept relationships.`,
				},
			],
			structuredContent: { concepts },
		};
	}

	@Tool({
		name: 'upsert_fact_concept',
		description: 'Add or update a semantic relationship between a fact and a concept',
		paramsSchema: {
			factId: z.string().describe('Fact ID'),
			meaning: factMeaningSchema,
		},
		annotations: { destructiveHint: true, idempotentHint: true },
	})
	async upsertFactConcept(
		{
			factId,
			meaning,
		}: McpToolParams<{
			factId: string;
			meaning: FactMeaningDto;
		}>,
		{ user }: types.McpExtra,
	): Promise<CallToolResult> {
		const concept = await this.factsService.upsertFactConcept(user.sub, factId, meaning);

		return {
			content: [{ type: 'text', text: `Linked ${meaning.concept.key} to fact ${factId}.` }],
			structuredContent: { concept },
		};
	}

	@Tool({
		name: 'get_expressions',
		description: 'Get all expression variants for a fact',
		paramsSchema: { factId: z.string().describe('Fact ID') },
		annotations: { destructiveHint: false, idempotentHint: true },
	})
	async getExpressions(
		{ factId }: McpToolParams<{ factId: string }>,
		{ user }: types.McpExtra,
	): Promise<CallToolResult> {
		const expressions = await this.factsService.findExpressions(user.sub, factId);

		return {
			content: [
				{
					type: 'text',
					text: `Found ${expressions.length} expressions.`,
				},
			],
			structuredContent: { expressions },
		};
	}

	@Tool({
		name: 'create_expression',
		description:
			'Create a written expression variant for a fact — a polished phrasing suitable for a resume bullet',
		paramsSchema: {
			factId: z.string().describe('Fact ID'),
			text: z.string().describe('The expression text'),
			length: z
				.string()
				.optional()
				.describe('Length category (e.g. "short", "medium", "long")'),
			tone: z.string().optional().describe('Tone (e.g. "formal", "concise")'),
		},
		annotations: { destructiveHint: true, idempotentHint: false },
	})
	async createExpression(
		{
			factId,
			...dto
		}: McpToolParams<{
			factId: string;
			text: string;
			length?: string;
			tone?: string;
		}>,
		{ user }: types.McpExtra,
	): Promise<CallToolResult> {
		const expression = await this.factsService.createExpression(user.sub, factId, dto);

		return {
			content: [
				{
					type: 'text',
					text: `Expression created with ID: ${expression.id}`,
				},
			],
			structuredContent: { expression },
		};
	}

	@Tool({
		name: 'delete_expression',
		description: 'Delete an expression variant',
		paramsSchema: {
			factId: z.string().describe('Fact ID'),
			expressionId: z.string().describe('Expression ID'),
		},
		annotations: { destructiveHint: true, idempotentHint: false },
	})
	async deleteExpression(
		{ factId, expressionId }: McpToolParams<{ factId: string; expressionId: string }>,
		{ user }: types.McpExtra,
	): Promise<CallToolResult> {
		await this.factsService.deleteExpression(user.sub, factId, expressionId);

		return {
			content: [{ type: 'text', text: `Expression ${expressionId} deleted.` }],
		};
	}

	@Tool({
		name: 'get_resume_facts',
		description: 'Get all facts linked to a specific resume',
		paramsSchema: { resumeId: z.string().describe('Resume ID') },
		annotations: { destructiveHint: false, idempotentHint: true },
	})
	async getResumeFacts({
		resumeId,
	}: McpToolParams<{ resumeId: string }>): Promise<CallToolResult> {
		const resumeFacts = await this.factsService.findResumeFacts(resumeId);

		return {
			content: [
				{
					type: 'text',
					text: `Found ${resumeFacts.length} facts linked to resume ${resumeId}.`,
				},
			],
			structuredContent: { resumeFacts },
		};
	}

	@Tool({
		name: 'link_fact_to_resume',
		description: 'Link a fact (with an optional expression) to a resume section',
		paramsSchema: {
			resumeId: z.string().describe('Resume ID'),
			factId: z.string().describe('Fact ID'),
			expressionId: z.string().optional().describe('Expression ID to use for this resume'),
			section: z
				.string()
				.optional()
				.describe('Resume section (e.g. "experience", "projects")'),
			position: z.number().int().optional().describe('Position within the section'),
		},
		annotations: { destructiveHint: true, idempotentHint: false },
	})
	async linkFactToResume(
		{
			resumeId,
			factId,
			...dto
		}: McpToolParams<{
			resumeId: string;
			factId: string;
			expressionId?: string;
			section?: string;
			position?: number;
		}>,
		{ user }: types.McpExtra,
	): Promise<CallToolResult> {
		const link = await this.factsService.linkFact(user.sub, resumeId, factId, dto);

		return {
			content: [
				{
					type: 'text',
					text: `Fact ${factId} linked to resume ${resumeId}.`,
				},
			],
			structuredContent: { link },
		};
	}

	@Tool({
		name: 'unlink_fact_from_resume',
		description: 'Remove a fact from a resume',
		paramsSchema: {
			resumeId: z.string().describe('Resume ID'),
			factId: z.string().describe('Fact ID'),
		},
		annotations: { destructiveHint: true, idempotentHint: false },
	})
	async unlinkFactFromResume({
		resumeId,
		factId,
	}: McpToolParams<{
		resumeId: string;
		factId: string;
	}>): Promise<CallToolResult> {
		await this.factsService.unlinkFact(resumeId, factId);

		return {
			content: [
				{
					type: 'text',
					text: `Fact ${factId} unlinked from resume ${resumeId}.`,
				},
			],
		};
	}
}
