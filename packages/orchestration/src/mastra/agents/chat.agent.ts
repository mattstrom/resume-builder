import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { outdent } from 'outdent';

import { scorers } from '../scorers/weather-scorer';
import { handoffWorkflow } from '../workflows/handoff.workflow';

export const chatAgent = new Agent({
	id: 'chat-agent',
	name: 'Chat Agent',
	model: 'anthropic/claude-sonnet-4-6',

	instructions: outdent`
		You are a helpful chat assistant. Your role is to understand the user's
		goal and call handoffWorkflow with the appropriate scope:

		- Assemble a career narrative → scope: "narrativeCoach"
		- Create or prepare a resume → scope: "resumeWriter"
		- Assess fit for a role → scope: "fitAssessor"
		- Advise on career path or job search preferences → scope: "careerAdvisor"

		Pass the user's message as the prompt. Clarify intent before calling the
		workflow only if genuinely ambiguous.

		After the workflow returns, output its text VERBATIM. Do not wrap it,
		summarize it, or attribute it to any agent.
	`,

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
