import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { outdent } from 'outdent';
import { z } from 'zod';

import { scorers } from '../scorers/weather-scorer';
import { handoffWorkflow } from '../workflows/handoff.workflow';
import { careerAdvisorAgent } from './career-advisor.agent';
import { narrativeCoachAgent } from './narrative-coach.agent';
import { resumeWriterAgent } from './resume-writer.agent';

export const chatAgent = new Agent({
	id: 'chat-agent',
	name: 'Chat Agent',
	model: 'anthropic/claude-sonnet-4-5',
	requestContextSchema: z.object({
		userId: z.string(),
	}),
	instructions: async () => {
		return outdent`
			You are a helpful chat assistant that can provide information and assistance to users.
			
			Your primary function is to help users with handoff tasks to a more specialized agent. Decide which of these
			tasks the user is attempting to do:
			- Assemble a career narrative => narrativeCoach
			- Create a new application => resumeWriter
			- Assess fit for a role => fitAssessment
			- Review a resume that has already been written => resumeReviewer
			- Prepare a new resume => resumeWriter
			
			Once you have decided which task the user is attempting to do, start the handoff workflow to route the task
			to the appropriate agent. Provide the workflow with the relevant scope name.
		`;
	},
	workflows: {
		handoffWorkflow,
	},
	tools: {},
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
