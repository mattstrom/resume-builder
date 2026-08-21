import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Resolver, Tool, UseGuards } from '@nestjs-mcp/server';
import {
	agentSearchResultTypeSchema,
	type AgentSearchResultType,
} from '@resume-builder/entities';
import { z } from 'zod';

import { AgentSearchService } from '../search/agent-search.service.js';
import { McpGuard } from './mcp.guard.js';
import type { McpExtra, McpToolParams } from './types.js';

@Resolver()
@UseGuards(McpGuard)
export class SearchResolver {
	constructor(private readonly agentSearch: AgentSearchService) {}

	@Tool({
		name: 'search_profile_evidence',
		description:
			'Hybrid lexical and semantic search over normalized evidence owned by the current user',
		paramsSchema: {
			query: z.string().trim().min(2),
			resultTypes: z.array(agentSearchResultTypeSchema).min(1),
			limit: z.number().int().min(1).max(60).optional(),
		},
		annotations: { destructiveHint: false, idempotentHint: true },
	})
	async searchProfileEvidence(
		{
			query,
			resultTypes,
			limit,
		}: McpToolParams<{
			query: string;
			resultTypes: AgentSearchResultType[];
			limit?: number;
		}>,
		{ user }: McpExtra,
	): Promise<CallToolResult> {
		const candidates = await this.agentSearch.search(
			user.sub,
			query,
			resultTypes,
			limit,
		);

		return {
			content: [
				{
					type: 'text',
					text: `Found ${candidates.length} search candidates.`,
				},
			],
			structuredContent: { candidates },
		};
	}
}
