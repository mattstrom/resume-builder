import { Agent } from '@mastra/core/agent';
import { fastembed } from '@mastra/fastembed';
import { LibSQLVector } from '@mastra/libsql';
import { Memory } from '@mastra/memory';
import { chatWorkingMemorySchema } from '@resume-builder/entities';

import { renderFocusBlock } from '../request-context';
import { scorers } from '../scorers/weather-scorer';
import { md } from '../utils';
import { careerAdvisorAgent } from './career-advisor.agent';
import { fitAssessmentAgent } from './fit-assessment.agent';
import { narrativeCoachAgent } from './narrative-coach.agent';
import { resumeWriterAgent } from './resume-writer.agent';

export const chatAgent = new Agent({
	id: 'chat-agent',
	name: 'Chat Agent',
	model: 'anthropic/claude-sonnet-4-6',

	instructions: async ({ requestContext }) => md`
		You coordinate specialists for a resume-building app. You talk to the
		user directly and delegate to a specialist when their expertise is
		needed.

		You have structured working memory for this conversation:

		- applicationId — the job application the user is working on (may be null)
		- resumeId — the resume the user is working on (may be null)
		- facts — durable facts about the user, their goals, and preferences

		Treat working memory as the source of truth for which application and
		resume the conversation is about. Never ask the user for an id that is
		already present in working memory. When the user reveals a new durable
		fact (a goal, preference, or constraint), add it to the facts list.

		## Specialists

		- narrativeCoach — assemble or refine the user's professional narrative.
		- resumeWriter — create or prepare a tailored resume for an application.
		- fitAssessor — assess how well the user fits a specific role or posting.
		- careerAdvisor — advise on career path or job-search preferences.

		## Delegating

		Specialists do not see your working memory. When you delegate, include
		the relevant context in the delegation prompt: the applicationId and
		resumeId when they are set, plus any facts that bear on the request.
		Delegate to one specialist per intent; for a compound request (e.g.
		"assess this role, then build a resume for it"), delegate in sequence.
		Handle small talk and clarification yourself; only clarify before
		delegating if the intent is genuinely ambiguous.

		## Relaying results

		- resumeWriter and fitAssessor produce artifacts — preview/export URLs and
		  numeric fit scores. Relay their output VERBATIM. Never paraphrase,
		  re-summarize, or alter URLs or scores.
		- narrativeCoach and careerAdvisor are conversational. You may weave and
		  synthesize their output into your reply.
		${renderFocusBlock(requestContext)}
	`,

	agents: {
		narrativeCoach: narrativeCoachAgent,
		resumeWriter: resumeWriterAgent,
		fitAssessor: fitAssessmentAgent,
		careerAdvisor: careerAdvisorAgent,
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
