import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Resolver, Tool, UseGuards } from '@nestjs-mcp/server';
import { conceptQualifierSchema, JobRequirementFactSchema } from '@resume-builder/entities';
import { z } from 'zod';

import {
	type CreateJobRequirementDto,
	JOB_REQUIREMENT_RELATIONS,
	JobRequirementsService,
} from '../job-requirements/job-requirements.service.js';
import { McpGuard } from './mcp.guard.js';
import * as types from './types.js';
import { type McpToolParams } from './types.js';

const requirementCreateSchema = JobRequirementFactSchema.omit({
	id: true,
	uid: true,
	applicationId: true,
	embeddingRevision: true,
	embeddedRevision: true,
	embeddingModel: true,
	embeddingProfile: true,
	createdAt: true,
}).extend({
	technologies: z
		.string()
		.array()
		.optional()
		.describe('Specific technologies or tools mentioned'),
	tags: z.string().array().optional().describe('Lowercase hyphenated classification tags'),
	meanings: z
		.array(
			z.object({
				relation: z.enum(JOB_REQUIREMENT_RELATIONS),
				concept: z.object({
					vocabulary: z.enum([
						'topic',
						'technology',
						'capability',
						'outcome',
						'artifact',
					]),
					key: z.string().trim().min(1),
					label: z.string().trim().min(1),
				}),
				confidence: z.number().min(0).max(1).optional(),
				qualifier: conceptQualifierSchema.optional(),
			}),
		)
		.min(1)
		.describe('Concept assertions distilled from this requirement'),
});

@Resolver()
@UseGuards(McpGuard)
export class JobRequirementsResolver {
	constructor(private readonly jobRequirementsService: JobRequirementsService) {}

	@Tool({
		name: 'create_job_requirements',
		description:
			'Replace the structured requirement facts extracted from a job description for a given application',
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
		const created = await this.jobRequirementsService.replace(
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
