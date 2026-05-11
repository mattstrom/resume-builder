import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { outdent } from 'outdent';
import { z } from 'zod';
import { resumeBuilderMcpClient } from '../mcp/resume-builder.mcp';

export const applicationReviewerAgent = new Agent({
	id: 'application-reviewer',
	name: 'Application Reviewer',
	model: 'anthropic/claude-sonnet-4-5',
	requestContextSchema: z.object({
		applicationId: z.string(),
	}),
	instructions: async ({ mastra, requestContext }) => {
		return [
			outdent`
				You are an expert resume review. Load the application with id = {{applicationId}}
				using the available tools. Review it and provide feedback.
			`,
		];
	},
	tools: async () => {
		const tools = await resumeBuilderMcpClient.listTools();

		return {
			...tools,
		};
	},
	scorers: {},
	memory: new Memory(),
});
