import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Resolver, Tool, UseGuards } from '@nestjs-mcp/server';
import { z } from 'zod';

import { ConceptsService, ConceptVocabulary } from '../concepts/concepts.service.js';
import { EmbeddingService } from '../queue/embeddings/embedding.service.js';
import { McpGuard } from './mcp.guard.js';
import * as types from './types.js';
import { type McpToolParams } from './types.js';

@Resolver()
@UseGuards(McpGuard)
export class ConceptsResolver {
	constructor(
		private readonly conceptsService: ConceptsService,
		private readonly embeddingService: EmbeddingService,
	) {}

	@Tool({
		name: 'get_concepts',
		description:
			"List concepts already linked to the current user's facts or bullets, optionally filtered by vocabulary and label",
		paramsSchema: {
			vocabulary: z.enum(ConceptVocabulary).describe('The controlled concept vocabulary'),
			search: z.string().optional().describe('Filter by label (substring match)'),
			limit: z.number().int().min(1).max(50).optional().describe('Max results (default 20)'),
		},
		annotations: { destructiveHint: false, idempotentHint: true },
	})
	async getConcepts(
		{
			vocabulary,
			search,
			limit,
		}: McpToolParams<{ vocabulary: ConceptVocabulary; search?: string; limit?: number }>,
		{ user }: types.McpExtra,
	): Promise<CallToolResult> {
		const concepts = await this.conceptsService.findConceptSuggestions(
			user.sub,
			vocabulary,
			search,
			limit,
		);

		return {
			content: [
				{
					type: 'text',
					text: `Found ${concepts.length} concepts.\n${JSON.stringify(concepts, null, 2)}`,
				},
			],
			structuredContent: { concepts },
		};
	}

	@Tool({
		name: 'search_concepts',
		description:
			"Semantic search over the current user's concepts using a natural-language query",
		paramsSchema: {
			query: z
				.string()
				.describe('Natural-language query to find semantically similar concepts'),
			vocabulary: z.enum(ConceptVocabulary).optional(),
			limit: z.number().int().min(1).max(50).optional().describe('Max results (default 10)'),
			minimumScore: z
				.number()
				.min(0)
				.max(1)
				.optional()
				.describe('Minimum similarity score, 0-1 (default 0.55)'),
		},
		annotations: { destructiveHint: false, idempotentHint: true },
	})
	async searchConcepts(
		{
			query,
			vocabulary,
			limit,
			minimumScore,
		}: McpToolParams<{
			query: string;
			vocabulary?: ConceptVocabulary;
			limit?: number;
			minimumScore?: number;
		}>,
		{ user }: types.McpExtra,
	): Promise<CallToolResult> {
		const vector = await this.embeddingService.embed(query);
		const matches = await this.conceptsService.findSimilarConcepts(
			user.sub,
			vector,
			vocabulary,
			limit,
			minimumScore,
		);

		return {
			content: [
				{
					type: 'text',
					text: `Found ${matches.length} matching concepts.\n${JSON.stringify(matches, null, 2)}`,
				},
			],
			structuredContent: { matches },
		};
	}

	@Tool({
		name: 'get_concept',
		description: 'Retrieve a single concept by ID',
		paramsSchema: { id: z.string().describe('Concept ID') },
		annotations: { destructiveHint: false, idempotentHint: true },
	})
	async getConcept({ id }: McpToolParams<{ id: string }>): Promise<CallToolResult> {
		const concept = await this.conceptsService.findConceptById(id);

		return {
			content: [
				{
					type: 'text',
					text: `Found concept ${concept.label}.\n${JSON.stringify(concept, null, 2)}`,
				},
			],
			structuredContent: { concept },
		};
	}

	@Tool({
		name: 'get_concept_relations',
		description:
			'Get the concept-to-concept ontology edges (e.g. "broader") for a concept, in both directions',
		paramsSchema: {
			conceptId: z.string().describe('Concept ID'),
			relation: z.string().optional().describe('Filter to a specific relation type'),
		},
		annotations: { destructiveHint: false, idempotentHint: true },
	})
	async getConceptRelations({
		conceptId,
		relation,
	}: McpToolParams<{ conceptId: string; relation?: string }>): Promise<CallToolResult> {
		const relations = await this.conceptsService.findConceptRelations(conceptId, relation);

		return {
			content: [
				{
					type: 'text',
					text: `Found ${relations.length} concept relations.\n${JSON.stringify(relations, null, 2)}`,
				},
			],
			structuredContent: { relations },
		};
	}

	@Tool({
		name: 'get_concept_aliases',
		description: 'Get alternate labels for a concept',
		paramsSchema: { conceptId: z.string().describe('Concept ID') },
		annotations: { destructiveHint: false, idempotentHint: true },
	})
	async getConceptAliases({
		conceptId,
	}: McpToolParams<{ conceptId: string }>): Promise<CallToolResult> {
		const aliases = await this.conceptsService.findConceptAliases(conceptId);

		return {
			content: [
				{
					type: 'text',
					text: `Found ${aliases.length} aliases.\n${JSON.stringify(aliases, null, 2)}`,
				},
			],
			structuredContent: { aliases },
		};
	}
}
