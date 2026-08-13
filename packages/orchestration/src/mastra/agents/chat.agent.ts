import { Agent } from '@mastra/core/agent';
import { MASTRA_AUTH_TOKEN_KEY } from '@mastra/core/request-context';
import { fastembed } from '@mastra/fastembed';
import { LibSQLVector } from '@mastra/libsql';
import { Memory } from '@mastra/memory';
import { chatWorkingMemorySchema } from '@resume-builder/entities';

import { createResumeBuilderMcpClient } from '../mcp/resume-builder.mcp';
import { renderFocusBlock } from '../request-context';
import { scorers } from '../scorers/weather-scorer';
import { md } from '../utils';
import { careerContextWorkflow } from '../workflows/career-context.workflow';
import { fitAssessmentWorkflow } from '../workflows/fit-assessment.workflow';

export const chatAgent = new Agent({
	id: 'chat-agent',
	name: 'Chat Agent',
	model: 'anthropic/claude-sonnet-4-6',

	instructions: async ({ requestContext }) => md`
		You help the user build their resume, tailor it to specific job
		applications, and manage their career narrative and preferences. Use the
		available tools to read and write their data directly — don't ask for
		information a tool can retrieve, and don't guess at data you can look up.

		Working memory tracks applicationId, resumeId, and durable facts (goals,
		preferences, constraints) for this conversation. Treat it as the source
		of truth — don't ask for an id already stored there. Add new durable
		facts as you learn them. When the user explicitly states or corrects a
		reusable career fact, check for an existing equivalent with get_facts and
		persist the confirmed claim through create_facts or update_fact. Do not turn
		an inference, grade change without explanation, or tentative wording into a
		canonical fact.

		A few things that aren't obvious from the data itself:
		- The user has 15+ years of experience. State that plainly; don't derive
		  years of experience from the jobs included in a resume.
		- Don't fabricate or inflate skills, responsibilities, or accomplishments
		  — use only what's in their actual data.
		- When you return a resume preview/export URL or a fit-assessment score,
		  relay it exactly as returned — don't alter or paraphrase it.
		${renderFocusBlock(requestContext)}
	`,

	tools: async ({ requestContext }) => {
		const token = (requestContext.get(MASTRA_AUTH_TOKEN_KEY) as string) ?? '';

		return createResumeBuilderMcpClient(token).listTools();
	},
	workflows: {
		careerContext: careerContextWorkflow,
		fitAssessment: fitAssessmentWorkflow,
	},
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
				scope: 'resource',
				schema: chatWorkingMemorySchema,
				agentManaged: true,
			},
			semanticRecall: true,
			observationalMemory: {
				enabled: true,
				model: 'anthropic/claude-sonnet-4-6',
				scope: 'resource',
				observation: {
					manageWorkingMemory: true,
					instruction:
						'Prioritize explicit career facts, preferences, constraints, credentials, and corrections to prior assessments. Preserve uncertainty and do not treat agent inference as confirmed fact.',
				},
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
