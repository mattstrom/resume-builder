import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Resolver, Tool, UseGuards } from '@nestjs-mcp/server';
import { z } from 'zod';

import { EmbeddingService } from '../facts/embedding.service.js';
import { FactsService } from '../facts/facts.service.js';
import { McpGuard } from './mcp.guard.js';
import * as types from './types.js';
import { type McpToolParams } from './types.js';

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
			'Retrieve facts for the current user, optionally filtered by kind, entityType, or entityId',
		paramsSchema: {
			kind: z.string().optional().describe('Filter by fact kind'),
			entityType: z.string().optional().describe('Filter by entity type'),
			entityId: z.string().optional().describe('Filter by entity ID'),
		},
		annotations: { destructiveHint: false, idempotentHint: true },
	})
	async getFacts(
		{
			kind,
			entityType,
			entityId,
		}: McpToolParams<{ kind?: string; entityType?: string; entityId?: string }>,
		{ user }: types.McpExtra,
	): Promise<CallToolResult> {
		const facts = await this.factsService.findAll(user.sub, { kind, entityType, entityId });

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
		description: 'Create multiple facts at once to avoid hitting tool call limits',
		paramsSchema: {
			facts: z
				.array(
					z.object({
						kind: z.string().describe('Category of fact'),
						what: z.string().describe('Description of the fact'),
						impact: z.string().optional().describe('Impact or outcome'),
						scale: z.string().optional().describe('Scale or magnitude'),
						tags: z.array(z.string()).optional().describe('Tags for classification'),
						technologies: z
							.array(z.string())
							.optional()
							.describe('Technologies involved'),
						entityType: z.string().optional().describe('Type of related entity'),
						entityId: z.string().optional().describe('ID of the related entity'),
						citation: z
							.string()
							.optional()
							.describe(
								'Key phrase from the narrative node this fact was extracted from',
							),
						citationNodeIndex: z
							.number()
							.int()
							.optional()
							.describe(
								'CRDT node index in the narrative document at the time of extraction',
							),
					}),
				)
				.describe('List of facts to create'),
		},
		annotations: { destructiveHint: true, idempotentHint: false },
	})
	async createFacts(
		{
			facts,
		}: McpToolParams<{
			facts: Array<{
				kind: string;
				what: string;
				impact?: string;
				scale?: string;
				tags?: string[];
				technologies?: string[];
				entityType?: string;
				entityId?: string;
				citation?: string;
				citationNodeIndex?: number;
			}>;
		}>,
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
		description: 'Update an existing fact',
		paramsSchema: {
			id: z.string().describe('Fact ID'),
			kind: z.string().optional(),
			what: z.string().optional(),
			impact: z.string().optional(),
			scale: z.string().optional(),
			tags: z.array(z.string()).optional(),
			technologies: z.array(z.string()).optional(),
			entityType: z.string().optional(),
			entityId: z.string().optional(),
			citation: z
				.string()
				.optional()
				.describe('Key phrase from the narrative node this fact was extracted from'),
			citationNodeIndex: z
				.number()
				.int()
				.optional()
				.describe('CRDT node index in the narrative document at the time of extraction'),
		},
		annotations: { destructiveHint: true, idempotentHint: false },
	})
	async updateFact(
		{
			id,
			...dto
		}: McpToolParams<{
			id: string;
			kind?: string;
			what?: string;
			impact?: string;
			scale?: string;
			tags?: string[];
			technologies?: string[];
			entityType?: string;
			entityId?: string;
			citation?: string;
			citationNodeIndex?: number;
		}>,
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
			content: [{ type: 'text', text: `Found ${expressions.length} expressions.` }],
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
		}: McpToolParams<{ factId: string; text: string; length?: string; tone?: string }>,
		{ user }: types.McpExtra,
	): Promise<CallToolResult> {
		const expression = await this.factsService.createExpression(user.sub, factId, dto);

		return {
			content: [{ type: 'text', text: `Expression created with ID: ${expression.id}` }],
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
			content: [{ type: 'text', text: `Fact ${factId} linked to resume ${resumeId}.` }],
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
	}: McpToolParams<{ resumeId: string; factId: string }>): Promise<CallToolResult> {
		await this.factsService.unlinkFact(resumeId, factId);

		return {
			content: [{ type: 'text', text: `Fact ${factId} unlinked from resume ${resumeId}.` }],
		};
	}
}
