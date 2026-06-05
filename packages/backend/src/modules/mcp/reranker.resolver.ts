import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Resolver, Tool, UseGuards } from '@nestjs-mcp/server';
import { z } from 'zod';

import configuration from '../../configuration.js';
import { FactsService } from '../facts/facts.service.js';
import { JobRequirementsService } from '../job-requirements/job-requirements.service.js';
import type { LlmToolDefinition } from '../llm/interfaces/llm-types.js';
import { LlmProviderRegistry } from '../llm/llm-provider-registry.service.js';
import { McpGuard } from './mcp.guard.js';
import * as types from './types.js';
import { type McpToolParams } from './types.js';

interface RankedMatch {
	factId: string;
	similarityScore: number;
	relevanceScore: number;
	satisfies: boolean;
	rationale: string;
}

const SCORE_TOOL: LlmToolDefinition = {
	name: 'score_relevance',
	description: 'Score whether a career fact satisfies a job requirement',
	inputSchema: {
		type: 'object',
		properties: {
			score: { type: 'number', description: '0.0–1.0 relevance score' },
			satisfies: { type: 'boolean' },
			rationale: { type: 'string', description: 'One sentence explanation' },
		},
		required: ['score', 'satisfies', 'rationale'],
	},
};

@Resolver()
@UseGuards(McpGuard)
export class RerankerResolver {
	constructor(
		private readonly jobRequirementsService: JobRequirementsService,
		private readonly factsService: FactsService,
		private readonly llmRegistry: LlmProviderRegistry,
	) {}

	@Tool({
		name: 'rerank_matches',
		description:
			'Re-rank candidate career facts against a job requirement using LLM scoring. Call find_matching_user_facts first to get candidates, then pass their IDs here for a more accurate second-pass ranking.',
		paramsSchema: {
			requirementId: z.string().describe('Job requirement fact ID'),
			candidates: z
				.array(
					z.object({
						factId: z.string().describe('Career fact ID'),
						similarityScore: z
							.number()
							.optional()
							.describe(
								'Vector similarity score from retrieval step (preserved in output)',
							),
					}),
				)
				.describe('Candidate facts to rerank'),
		},
		annotations: { destructiveHint: false, idempotentHint: false },
	})
	async rerankMatches(
		{
			requirementId,
			candidates,
		}: McpToolParams<{
			requirementId: string;
			candidates: Array<{ factId: string; similarityScore?: number }>;
		}>,
		{ user }: types.McpExtra,
	): Promise<CallToolResult> {
		const requirement = await this.jobRequirementsService.findById(requirementId);
		const factIds = candidates.map((c) => c.factId);
		const facts = await this.factsService.findByIds(user.sub, factIds);

		const { provider: providerName, model } = configuration.llms.reranker;
		const provider = this.llmRegistry.getProvider(providerName);

		const ranked = await Promise.all(
			candidates.map(async (candidate): Promise<RankedMatch | null> => {
				const fact = facts.find((f) => f.id === candidate.factId);
				if (!fact) return null;

				const factText = [fact.what, fact.impact].filter(Boolean).join('\n');

				const stream = provider.stream({
					model,
					maxTokens: 256,
					system: 'You are a precise job-fit evaluator. Always respond by calling score_relevance.',
					messages: [
						{
							role: 'user',
							content: `Job requirement: "${requirement.what}"\nCareer fact: "${factText}"\n\nDoes this career fact demonstrate the candidate satisfies this requirement?`,
						},
					],
					tools: [SCORE_TOOL],
				});

				let result: { score: number; satisfies: boolean; rationale: string } | null = null;
				for await (const event of stream) {
					if (event.type === 'tool-use' && event.name === 'score_relevance') {
						result = event.input as typeof result;
					}
				}

				return {
					factId: candidate.factId,
					similarityScore: candidate.similarityScore ?? 0,
					relevanceScore: result?.score ?? 0,
					satisfies: result?.satisfies ?? false,
					rationale: result?.rationale ?? 'No score returned',
				};
			}),
		);

		const results = ranked
			.filter((r): r is RankedMatch => r !== null)
			.sort((a, b) => b.relevanceScore - a.relevanceScore);

		return {
			content: [
				{
					type: 'text',
					text: `Reranked ${results.length} candidates for requirement ${requirementId}.`,
				},
			],
			structuredContent: { ranked: results },
		};
	}
}
