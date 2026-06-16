import { Agent } from '@mastra/core/agent';
import { MASTRA_AUTH_TOKEN_KEY } from '@mastra/core/request-context';
import { Memory } from '@mastra/memory';
import { outdent } from 'outdent';

import config from '@/config';

import { createResumeBuilderMcpClient } from '../mcp/resume-builder.mcp';
import { scorers } from '../scorers/weather-scorer';

export const narrativeCoachAgent = new Agent({
	id: 'narrative-coach',
	name: 'Narrative Coach',
	description: 'Assist the user in crafting their professional narrative',
	model: config.llms.defaultModel,
	instructions: async () => {
		return outdent`
			You are an expert career coach helping the user craft their professional narrative.
			
			Use the available tools to retrieve the candidate's narrative.
		`;
	},
	tools: async ({ requestContext }) => {
		const token = (requestContext.get(MASTRA_AUTH_TOKEN_KEY) as string) ?? '';
		const tools = await createResumeBuilderMcpClient(token).listTools();

		return {
			resumeBuilder_read_narrative: tools.resumeBuilder_read_narrative,
			// resumeBuilder_edit_narrative: tools.resumeBuilder_edit_narrative,
		};
	},
	scorers: {
		toolCallAppropriateness: {
			scorer: scorers.toolCallAppropriatenessScorer,
			sampling: {
				type: 'ratio',
				rate: 1,
			},
		},
		completeness: {
			scorer: scorers.completenessScorer,
			sampling: {
				type: 'ratio',
				rate: 1,
			},
		},
		translation: {
			scorer: scorers.translationScorer,
			sampling: {
				type: 'ratio',
				rate: 1,
			},
		},
	},
	memory: new Memory(),
});
