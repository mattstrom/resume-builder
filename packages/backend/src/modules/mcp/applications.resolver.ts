import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Resolver, Tool, UseGuards } from '@nestjs-mcp/server';
import {
	Analysis,
	analysisSchema,
	Application,
	applicationInputSchema,
} from '@resume-builder/entities';
import { outdent } from 'outdent';
import { z } from 'zod';

import { ApplicationsService } from '../entities/applications/applications.service.js';
import { McpGuard } from './mcp.guard.js';
import { type McpToolParams } from './types.js';
import * as types from './types.js';

@Resolver()
@UseGuards(McpGuard)
export class ApplicationsResolver {
	constructor(private readonly applicationsService: ApplicationsService) {}

	@Tool({
		name: 'get_applications',
		description: 'Retrieve all job applications and their analyses',
		annotations: {
			destructiveHint: false,
			idempotentHint: true,
		},
	})
	async getApplications({ user }: types.McpExtra): Promise<CallToolResult> {
		const applications = await this.applicationsService.findAll(user.sub);

		return {
			content: [
				{
					type: 'text',
					text: `Found ${applications.length} applications.`,
				},
			],
			structuredContent: {
				applications,
			},
		};
	}

	@Tool({
		name: 'get_application',
		description: 'Retrieve specific job application by ID and its analysis',
		paramsSchema: { id: z.string() },
		annotations: {
			destructiveHint: false,
			idempotentHint: true,
		},
	})
	async getApplication(
		{ id }: McpToolParams<{ id: string }>,
		{ user }: types.McpExtra,
	): Promise<CallToolResult> {
		const application = await this.applicationsService.find(user.sub, id);

		if (!application) {
			return {
				content: [
					{
						type: 'text',
						text: `Application with ID ${id} not found.`,
					},
				],
			};
		}

		return {
			content: [
				{
					type: 'text',
					text: outdent`
						Found application with ID ${id}.
						${JSON.stringify(application)}
					`,
				},
			],
			structuredContent: {
				application,
			},
		};
	}

	@Tool({
		name: 'create_application',
		description:
			'Use this tool to create a job application. An application represents a top-level container for all the information about a candidate applying for a job, like a resume and a cover letter.',
		paramsSchema: { application: applicationInputSchema },
		annotations: {
			destructiveHint: true,
			idempotentHint: false,
		},
	})
	async createApplication(
		{ application }: types.McpToolParams<{ application: Application }>,
		{ user }: types.McpExtra,
	) {
		const savedApplication = await this.applicationsService.create(user.sub, application);

		return {
			content: [
				{
					type: 'text',
					text: `Application saved successfully. ID: ${savedApplication._id}`,
				},
			],
			structuredContent: {
				application: savedApplication,
			},
		};
	}

	@Tool({
		name: 'update_job_description',
		description:
			'Stores the raw text of a job posting on an application, typically after retrieving it from the job posting URL',
		paramsSchema: {
			applicationId: z.string(),
			jobDescription: z.string(),
		},
		annotations: {
			destructiveHint: true,
			idempotentHint: true,
		},
	})
	async updateJobDescription(
		{
			applicationId,
			jobDescription,
		}: types.McpToolParams<{ applicationId: string; jobDescription: string }>,
		{ user }: types.McpExtra,
	) {
		const savedApplication = await this.applicationsService.update(user.sub, applicationId, {
			jobDescription,
		});

		return {
			content: [
				{
					type: 'text',
					text: outdent`
						Job description saved for application ${savedApplication._id}.
						${JSON.stringify({ application: savedApplication })}
					`,
				},
			],
			structuredContent: {
				application: savedApplication,
			},
		};
	}

	@Tool({
		name: 'update_analysis',
		description:
			'Updates the analysis of a job application with skill fit, strengths, weaknesses, and relevance scores',
		paramsSchema: { applicationId: z.string(), analysis: analysisSchema },
		annotations: {
			destructiveHint: true,
			idempotentHint: false,
		},
	})
	async updateAnalysis(
		{
			applicationId,
			analysis,
		}: types.McpToolParams<{ applicationId: string; analysis: Analysis }>,
		{ user }: types.McpExtra,
	) {
		const savedApplication = await this.applicationsService.updateAnalysis(
			user.sub,
			applicationId,
			analysis,
		);

		return {
			content: [
				{
					type: 'text',
					text: `Application saved successfully. ID: ${savedApplication._id}`,
				},
			],
			structuredContent: {
				application: savedApplication,
			},
		};
	}
}
