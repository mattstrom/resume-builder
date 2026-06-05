import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Resolver, Tool, UseGuards } from '@nestjs-mcp/server';
import { z } from 'zod';

import { JobRequirementsService } from '../job-requirements/job-requirements.service.js';
import { McpGuard } from './mcp.guard.js';
import * as types from './types.js';
import { type McpToolParams } from './types.js';

@Resolver()
@UseGuards(McpGuard)
export class JobRequirementsResolver {
	constructor(private readonly jobRequirementsService: JobRequirementsService) {}

	@Tool({
		name: 'create_job_requirements',
		description:
			'Create structured requirement facts extracted from a job description for a given application',
		paramsSchema: {
			applicationId: z.string().describe('Application ID'),
			requirements: z
				.array(
					z.object({
						kind: z
							.string()
							.describe(
								'Requirement kind: "required", "preferred", "responsibility", or "culture"',
							),
						what: z.string().describe('One-sentence description of the requirement'),
						technologies: z
							.array(z.string())
							.optional()
							.describe('Specific technologies or tools mentioned'),
						tags: z
							.array(z.string())
							.optional()
							.describe('Lowercase hyphenated classification tags'),
					}),
				)
				.describe('List of requirement facts to create'),
		},
		annotations: { destructiveHint: true, idempotentHint: false },
	})
	async createJobRequirements(
		{
			applicationId,
			requirements,
		}: McpToolParams<{
			applicationId: string;
			requirements: Array<{
				kind: string;
				what: string;
				technologies?: string[];
				tags?: string[];
			}>;
		}>,
		{ user }: types.McpExtra,
	): Promise<CallToolResult> {
		const created = await this.jobRequirementsService.create(
			user.sub,
			applicationId,
			requirements,
		);

		return {
			content: [{ type: 'text', text: `Created ${created.length} job requirement facts.` }],
			structuredContent: { requirements: created },
		};
	}

	@Tool({
		name: 'get_job_requirements',
		description: 'Get all requirement facts extracted from a job description for an application',
		paramsSchema: {
			applicationId: z.string().describe('Application ID'),
		},
		annotations: { destructiveHint: false, idempotentHint: true },
	})
	async getJobRequirements(
		{ applicationId }: McpToolParams<{ applicationId: string }>,
		{ user }: types.McpExtra,
	): Promise<CallToolResult> {
		const requirements = await this.jobRequirementsService.findByApplication(
			user.sub,
			applicationId,
		);

		return {
			content: [
				{
					type: 'text',
					text: `Found ${requirements.length} requirement facts for application ${applicationId}.`,
				},
			],
			structuredContent: { requirements },
		};
	}

	@Tool({
		name: 'find_matching_user_facts',
		description:
			'Find user career facts that semantically match a specific job requirement — useful for gap analysis and resume tailoring',
		paramsSchema: {
			requirementId: z.string().describe('Job requirement fact ID'),
			limit: z.number().int().min(1).max(20).optional().describe('Max results (default 10)'),
		},
		annotations: { destructiveHint: false, idempotentHint: true },
	})
	async findMatchingUserFacts(
		{ requirementId, limit }: McpToolParams<{ requirementId: string; limit?: number }>,
		{ user }: types.McpExtra,
	): Promise<CallToolResult> {
		const facts = await this.jobRequirementsService.findSimilarToRequirement(
			requirementId,
			user.sub,
			limit,
		);

		return {
			content: [
				{
					type: 'text',
					text: `Found ${facts.length} user facts matching requirement ${requirementId}.`,
				},
			],
			structuredContent: { facts },
		};
	}
}
