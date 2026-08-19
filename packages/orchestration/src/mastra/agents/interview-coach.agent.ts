import { Agent, type ToolsInput } from '@mastra/core/agent';
import { MASTRA_AUTH_TOKEN_KEY } from '@mastra/core/request-context';
import { Memory } from '@mastra/memory';
import { outdent } from 'outdent';
import { z } from 'zod';

import { getResumeBuilderTools } from '../mcp/resume-builder.mcp';
import { scorers } from '../scorers/weather-scorer';

export const interviewCoachAgent = new Agent({
	id: 'interview-coach',
	name: 'Interview Coach',
	description: 'Coach the user in preparing for and debriefing from interviews',
	model: 'anthropic/claude-sonnet-4-6',
	requestContextSchema: z.object({
		scope: z.string().optional(),
	}),
	instructions: async () => {
		return outdent`
			You are an expert interview coach helping the user prepare for and debrief from interviews.
	
			Use the available tools to retrieve the candidate's narrative, resume, work experience, projects, and skills.
		`;
	},
	tools: async ({ requestContext }): Promise<ToolsInput> => {
		const token = (requestContext.get(MASTRA_AUTH_TOKEN_KEY) as string) ?? '';

		// Mastra evaluates `tools` outside a real request too (e.g. Studio's own
		// introspection), when there is no auth token to connect with. Skip the
		// MCP connection rather than let it fail and leak.
		if (!token) {
			return {};
		}

		const tools = await getResumeBuilderTools(token);

		const {
			resumeBuilder_read_narrative,
			resumeBuilder_get_resume,
			resumeBuilder_get_education,
			resumeBuilder_get_jobs,
			resumeBuilder_get_projects,
			resumeBuilder_get_skills,
		} = tools;

		return {
			resumeBuilder_read_narrative,
			resumeBuilder_get_resume,
			resumeBuilder_get_education,
			resumeBuilder_get_jobs,
			resumeBuilder_get_projects,
			resumeBuilder_get_skills,
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
