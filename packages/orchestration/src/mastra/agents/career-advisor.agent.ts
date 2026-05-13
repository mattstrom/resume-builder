import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { outdent } from 'outdent';

import { resumeBuilderMcpClient } from '../mcp/resume-builder.mcp';

export const careerAdvisorAgent = new Agent({
	id: 'career-advisor',
	name: 'Career Advisor',
	description: 'Assist the user in refining their job search preferences',
	model: () => 'anthropic/claude-sonnet-4-5',
	requestContextSchema: {},
	instructions: async ({ mastra, requestContext }) => {
		return outdent`
			You are an expert career advisor helping the user clarify and refine their job search preferences.
	
			Use the available tools to retrieve the candidate's job search preferences.
		`;
	},
	tools: async () => {
		const tools = await resumeBuilderMcpClient.listTools();

		return {
			resumeBuilder_read_preferences: tools.resumeBuilder_read_preferences,
			resumeBuilder_edit_preferences: tools.resumeBuilder_edit_preferences,
		};
	},
	scorers: {},
	memory: new Memory(),
});
