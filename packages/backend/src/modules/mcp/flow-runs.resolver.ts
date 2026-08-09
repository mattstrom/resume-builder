import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Resolver, Tool, UseGuards } from '@nestjs-mcp/server';
import {
	Flow,
	type FlowRunUpsert,
	FlowRunStatus,
	FlowSubject,
	flowRunStatusSchema,
	flowSchema,
	flowSubjectSchema,
} from '@resume-builder/entities';
import { outdent } from 'outdent';
import { z } from 'zod';

import { FlowRunsService } from '../entities/flow-runs/flow-runs.service.js';
import { McpGuard } from './mcp.guard.js';
import { type McpToolParams } from './types.js';
import * as types from './types.js';

@Resolver()
@UseGuards(McpGuard)
export class FlowRunsResolver {
	constructor(private readonly flowRunsService: FlowRunsService) {}

	@Tool({
		name: 'upsert_flow_run',
		description:
			'Records the state of a workflow run against a subject. Call it with status "running" when the run starts and again with a terminal status when it finishes. One record is kept per subject and flow.',
		paramsSchema: {
			flow: flowSchema,
			subjectType: flowSubjectSchema,
			subjectId: z
				.string()
				.optional()
				.describe('Omit for runs scoped to a collection or to the user'),
			status: flowRunStatusSchema,
			runId: z.string().optional().describe('Mastra run ID, for step-level detail'),
			error: z.string().optional(),
			finishedAt: z.iso.datetime().optional(),
		},
		annotations: {
			destructiveHint: false,
			idempotentHint: true,
		},
	})
	async upsertFlowRun(
		{
			flow,
			subjectType,
			subjectId,
			status,
			runId,
			error,
			finishedAt,
		}: McpToolParams<{
			flow: Flow;
			subjectType: FlowSubject;
			subjectId?: string;
			status: FlowRunStatus;
			runId?: string;
			error?: string;
			finishedAt?: string;
		}>,
		{ user }: types.McpExtra,
	): Promise<CallToolResult> {
		const input: FlowRunUpsert = {
			flow,
			subjectType,
			subjectId,
			status,
			runId,
			error,
			finishedAt,
		};
		const flowRun = await this.flowRunsService.upsert(user.sub, input);

		return {
			content: [
				{
					type: 'text',
					text: outdent`
						Recorded ${flow} as ${status} for ${subjectType} ${subjectId ?? '(unscoped)'}.
						${JSON.stringify({ flowRun })}
					`,
				},
			],
			structuredContent: {
				flowRun,
			},
		};
	}

	@Tool({
		name: 'get_flow_runs',
		description: 'Retrieves the recorded workflow runs for one subject, newest first',
		paramsSchema: {
			subjectType: flowSubjectSchema,
			subjectId: z.string(),
		},
		annotations: {
			destructiveHint: false,
			idempotentHint: true,
		},
	})
	async getFlowRuns(
		{ subjectType, subjectId }: McpToolParams<{ subjectType: FlowSubject; subjectId: string }>,
		{ user }: types.McpExtra,
	): Promise<CallToolResult> {
		const flowRuns = await this.flowRunsService.findForSubject(
			user.sub,
			subjectType,
			subjectId,
		);

		return {
			content: [
				{
					type: 'text',
					text: outdent`
						Found ${flowRuns.length} flow runs for ${subjectType} ${subjectId}.
						${JSON.stringify({ flowRuns })}
					`,
				},
			],
			structuredContent: {
				flowRuns,
			},
		};
	}
}
