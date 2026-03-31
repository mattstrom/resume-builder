import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Resolver, Tool, UseGuards } from '@nestjs-mcp/server';
import {
	Analysis,
	analysisSchema,
	Application,
	applicationInputSchema,
} from '@resume-builder/entities';
import { z } from 'zod';

import { ApplicationsService } from '../entities/applications/applications.service';
import { McpGuard } from './mcp.guard';
import { type McpToolParams } from './types';
import * as types from './types';

@Resolver()
@UseGuards(McpGuard)
export class ApplicationsResolver {
	constructor(private readonly applicationsService: ApplicationsService) {}

	@Tool({
		name: 'get_applications',
		description: 'Retrieve all job applications and their analyses',
		annotations: {
			destructureHint: false,
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
			destructureHint: false,
			idempotentHint: true,
		},
	})
	async getApplication(
		{ id }: McpToolParams<{ id: string }>,
		{ user }: types.McpExtra,
	): Promise<CallToolResult> {
		const application = await this.applicationsService.find(user.sub, id);

		return {
			content: [
				{
					type: 'text',
					text: `Found application with ID ${id}.`,
				},
			],
			structuredContent: {
				application,
			},
		};
	}

	@Tool({
		name: 'create_application',
		description: 'Creates a job application',
		paramsSchema: { application: applicationInputSchema },
		annotations: {
			destructureHint: true,
			idempotentHint: false,
		},
	})
	async createApplication(
		{ application }: types.McpToolParams<{ application: Application }>,
		{ user }: types.McpExtra,
	) {
		const savedApplication = await this.applicationsService.create(
			user.sub,
			application,
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

	@Tool({
		name: 'update_analysis',
		description:
			'Updates the analysis of a job application with skill fit, strengths, weaknesses, and relevance scores',
		paramsSchema: { applicationId: z.string(), analysis: analysisSchema },
		annotations: {
			destructureHint: true,
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
