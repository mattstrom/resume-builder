import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { outdent } from 'outdent';
import { z } from 'zod';
import { resumeBuilderMcpClient } from '../mcp/resume-builder.mcp';
import { scorers } from '../scorers/weather-scorer';

export const narrativeCoachAgent = new Agent({
	id: 'narrative-coach',
	name: 'Narrative Coach',
	description: 'Assist the user in crafting their professional narrative',
	model: 'anthropic/claude-sonnet-4-5',
	requestContextSchema: z.object({
		scope: z.string().optional(),
	}),
	instructions: async ({ mastra, requestContext }) => {
		const editor = mastra?.getEditor();

		return outdent`
			You are an expert career coach helping the user craft their professional narrative.
	
			Use the available tools to retrieve the candidate's narrative.
		`;
	},
	tools: async () => {
		const tools = await resumeBuilderMcpClient.listTools();

		return {
			resumeBuilder_read_narrative: tools.resumeBuilder_read_narrative,
			resumeBuilder_edit_narrative: tools.resumeBuilder_edit_narrative,
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
