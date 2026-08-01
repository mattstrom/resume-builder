import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Resolver, Tool, UseGuards } from '@nestjs-mcp/server';
import { JobRequirementFactSchema } from '@resume-builder/entities';
import { z } from 'zod';

import {
	type CreateJobRequirementDto,
	JobRequirementsService,
} from '../job-requirements/job-requirements.service.js';
import { McpGuard } from './mcp.guard.js';
import * as types from './types.js';
import { type McpToolParams } from './types.js';

const requirementCreateSchema = JobRequirementFactSchema.omit({
	id: true,
	uid: true,
	applicationId: true,
	createdAt: true,
}).extend({
	technologies: z
		.string()
		.array()
		.optional()
		.describe('Specific technologies or tools mentioned'),
	tags: z.string().array().optional().describe('Lowercase hyphenated classification tags'),
});

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
				.array(requirementCreateSchema)
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
			requirements: CreateJobRequirementDto[];
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
		description:
			'Get all requirement facts extracted from a job description for an application',
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
}
