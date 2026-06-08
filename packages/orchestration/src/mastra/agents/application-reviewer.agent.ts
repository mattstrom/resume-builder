import { Agent } from '@mastra/core/agent';
import { MASTRA_AUTH_TOKEN_KEY } from '@mastra/core/request-context';
import { Memory } from '@mastra/memory';
import { outdent } from 'outdent';
import { z } from 'zod';

import { createResumeBuilderMcpClient } from '../mcp/resume-builder.mcp';

export const applicationReviewerAgent = new Agent({
	id: 'application-reviewer',
	name: 'Application Reviewer',
	model: 'anthropic/claude-sonnet-4-6',
	requestContextSchema: z.object({
		applicationId: z.string(),
	}),
	instructions: async () => {
		return [
			outdent`
				You are an expert resume review. Load the application with id = {{applicationId}}
				using the available tools. Review it and provide feedback.
			`,
		];
	},
	tools: async ({ requestContext }) => {
		const token = (requestContext.get(MASTRA_AUTH_TOKEN_KEY) as string) ?? '';
		const tools = await createResumeBuilderMcpClient(token).listTools();

		return {
			...tools,
		};
	},
	scorers: {},
	memory: new Memory(),
});
