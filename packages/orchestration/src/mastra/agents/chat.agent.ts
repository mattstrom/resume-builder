import { Agent } from '@mastra/core/agent';
import { fastembed } from '@mastra/fastembed';
import { LibSQLVector } from '@mastra/libsql';
import { Memory } from '@mastra/memory';
import { chatWorkingMemorySchema } from '@resume-builder/entities';
import { outdent } from 'outdent';

import { scorers } from '../scorers/weather-scorer';
import { handoffWorkflow } from '../workflows/handoff.workflow';

export const chatAgent = new Agent({
	id: 'chat-agent',
	name: 'Chat Agent',
	model: 'anthropic/claude-sonnet-4-6',

	instructions: outdent`
		You are a helpful chat assistant for a resume-building app.

		You have structured working memory for this conversation:
		- applicationId — the job application the user is working on (may be null)
		- resumeId — the resume the user is working on (may be null)
		- facts — durable facts about the user, their goals, and preferences

		Treat working memory as the source of truth for which application and
		resume the conversation is about. Never ask the user for an id that is
		already present in working memory. When the user reveals a new durable
		fact (a goal, preference, or constraint), add it to the facts list.

		Your job is to understand the user's goal and call handoffWorkflow with
		the appropriate scope:

		- Assemble a career narrative → scope: "narrativeCoach"
		- Create or prepare a resume → scope: "resumeWriter"
		- Assess fit for a role → scope: "fitAssessor"
		- Advise on career path or job search preferences → scope: "careerAdvisor"

		The downstream agent only receives the prompt you pass — it cannot see
		working memory. So build the prompt from the user's message plus the
		relevant context from working memory: the applicationId and resumeId when
		they are set, and any facts that bear on the request. Clarify intent
		before calling the workflow only if genuinely ambiguous.

		After the workflow returns, output its text VERBATIM. Do not wrap it,
		summarize it, or attribute it to any agent.
	`,

	workflows: {
		handoffWorkflow,
	},
	tools: {},
	memory: new Memory({
		vector: new LibSQLVector({
			id: 'resume-builder-chat-vector',
			url: 'file:./local.db',
		}),
		embedder: fastembed,
		options: {
			lastMessages: 20,
			workingMemory: {
				enabled: true,
				scope: 'thread',
				schema: chatWorkingMemorySchema,
			},
			semanticRecall: true,
			observationalMemory: {
				enabled: true,
			},
		},
	}),
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
});
