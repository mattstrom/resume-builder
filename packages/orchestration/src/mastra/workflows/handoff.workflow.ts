import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { careerAdvisorAgent } from '../agents/career-advisor.agent';
import { fitAssessmentAgent } from '../agents/fit-assessment.agent';
import { narrativeCoachAgent } from '../agents/narrative-coach.agent';
import { resumeWriterAgent } from '../agents/resume-writer.agent';

const inputSchema = z.object({
	scope: z.string().describe('The scope of the handoff'),
	prompt: z.string().describe('The prompt to be passed to the handoff agent'),
});

const outputSchema = z.object({
	text: z.string(),
});

const narrativeCoachStep = createStep({
	id: 'narrative-coach-step',
	inputSchema,
	outputSchema,
	execute: async ({ inputData, mastra }) => {
		const agent = mastra?.getAgent('narrativeCoach') ?? narrativeCoachAgent;
		const result = await agent.generate([{ role: 'user', content: inputData.prompt }]);

		return { text: result.text };
	},
});

const resumeWriterStep = createStep({
	id: 'resume-writer-step',
	inputSchema,
	outputSchema,
	execute: async ({ inputData, mastra }) => {
		const agent = mastra?.getAgent('resumeWriter') ?? resumeWriterAgent;
		const result = await agent.generate([{ role: 'user', content: inputData.prompt }]);

		return { text: result.text };
	},
});

const fitAssessorStep = createStep({
	id: 'fit-assessor-step',
	inputSchema,
	outputSchema,
	execute: async ({ inputData, mastra }) => {
		const agent = mastra?.getAgent('fitAssessmentAgent') ?? fitAssessmentAgent;
		const result = await agent.generate([{ role: 'user', content: inputData.prompt }]);

		return { text: result.text };
	},
});

const careerAdvisorStep = createStep({
	id: 'career-advisor-step',
	inputSchema,
	outputSchema,
	execute: async ({ inputData, mastra }) => {
		const agent = mastra?.getAgent('careerAdvisor') ?? careerAdvisorAgent;
		const result = await agent.generate([{ role: 'user', content: inputData.prompt }]);

		return { text: result.text };
	},
});

const handoffWorkflow = createWorkflow({
	id: 'handoff-workflow',
	inputSchema,
	outputSchema,
}).branch([
	[async ({ inputData }) => inputData.scope === 'narrativeCoach', narrativeCoachStep],
	[async ({ inputData }) => inputData.scope === 'resumeWriter', resumeWriterStep],
	[async ({ inputData }) => inputData.scope === 'fitAssessor', fitAssessorStep],
	[async ({ inputData }) => inputData.scope === 'careerAdvisor', careerAdvisorStep],
]);

handoffWorkflow.commit();

export { handoffWorkflow };
