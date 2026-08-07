import { MASTRA_AUTH_TOKEN_KEY } from '@mastra/core/request-context';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { jobRequirementsExtractorAgent } from '../agents/job-requirements-extractor.agent';

const inputSchema = z.object({ applicationId: z.string() });
const outputSchema = z.object({ applicationId: z.string() });

const identifyJobConcepts = createStep({
	id: 'identify-job-concepts',
	description: 'Identifies and persists atomic concept assertions from a job description',
	inputSchema,
	outputSchema,
	requestContextSchema: z.object({
		[MASTRA_AUTH_TOKEN_KEY]: z.string().min(1),
	}),
	execute: async ({ inputData, mastra, requestContext }) => {
		const agent = mastra?.getAgent('jobRequirementsExtractor') ?? jobRequirementsExtractorAgent;

		const result = await agent.generate(
			[
				{
					role: 'user',
					content: `Identify concept-based requirements for application ID: ${inputData.applicationId}`,
				},
			],
			{ maxSteps: 5, requestContext },
		);
		const persistedRequirements = (result.steps ?? [])
			.flatMap((step) => step.toolResults ?? [])
			.some((toolResult) => toolResult.payload.toolName.endsWith('create_job_requirements'));

		if (!persistedRequirements) {
			throw new Error('The agent did not persist any identified job concepts.');
		}

		return inputData;
	},
});

export const jobConceptIdentificationWorkflow = createWorkflow({
	id: 'job-concept-identification-workflow',
	description: 'Identifies concept assertions in an application job description',
	requestContextSchema: z.object({
		[MASTRA_AUTH_TOKEN_KEY]: z.string().min(1),
	}),
	inputSchema,
	outputSchema,
})
	.then(identifyJobConcepts)
	.commit();
