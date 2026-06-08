import { Agent } from '@mastra/core/agent';
import { MASTRA_AUTH_TOKEN_KEY } from '@mastra/core/request-context';
import { Memory } from '@mastra/memory';
import { outdent } from 'outdent';

import { createResumeBuilderMcpClient } from '../mcp/resume-builder.mcp';

export const careerAdvisorAgent = new Agent({
	id: 'career-advisor',
	name: 'Career Advisor',
	description: 'Assist the user in refining their job search preferences',
	model: () => 'anthropic/claude-sonnet-4-6',
	requestContextSchema: {},
	instructions: async () => {
		return outdent`
			You are an expert career advisor helping the user clarify and refine their job search preferences.
	
			Use the available tools to retrieve the candidate's job search preferences.
		`;
	},
	tools: async ({ requestContext }) => {
		const token = (requestContext.get(MASTRA_AUTH_TOKEN_KEY) as string) ?? '';
		const tools = await createResumeBuilderMcpClient(token).listTools();

		return {
			resumeBuilder_read_preferences: tools.resumeBuilder_read_preferences,
			resumeBuilder_edit_preferences: tools.resumeBuilder_edit_preferences,
		};
	},
	scorers: {},
	memory: new Memory(),
});
