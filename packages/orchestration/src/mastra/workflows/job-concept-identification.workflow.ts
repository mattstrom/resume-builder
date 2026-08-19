import { MASTRA_AUTH_TOKEN_KEY } from '@mastra/core/request-context';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { conceptQualifierSchema } from '@resume-builder/entities';
import { z } from 'zod';

import { jobRequirementsExtractorAgent } from '../agents/job-requirements-extractor.agent';
import { withResumeBuilderTools } from '../mcp/resume-builder.mcp';

const inputSchema = z.object({ applicationId: z.string() });
const outputSchema = z.object({ applicationId: z.string() });
const jobRequirementSchema = z.object({
	kind: z.enum(['required', 'preferred', 'responsibility', 'culture']),
	what: z.string().trim().min(1),
	technologies: z.array(z.string()).optional(),
	tags: z.array(z.string()).optional(),
	meanings: z
		.array(
			z.object({
				relation: z.enum(['requires', 'prefers', 'expects']),
				concept: z.object({
					vocabulary: z.enum([
						'topic',
						'technology',
						'capability',
						'outcome',
						'artifact',
					]),
					key: z.string().trim().min(1),
					label: z.string().trim().min(1),
				}),
				confidence: z.number().min(0).max(1).optional(),
				qualifier: conceptQualifierSchema.optional(),
			}),
		)
		.min(1),
});
const identifiedJobConceptsSchema = z.object({
	applicationId: z.string(),
	requirements: z.array(jobRequirementSchema).min(1),
});

const identifyJobConcepts = createStep({
	id: 'identify-job-concepts',
	description: 'Identifies atomic concept assertions from a job description',
	inputSchema,
	outputSchema: identifiedJobConceptsSchema,
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
			{
				maxSteps: 5,
				requestContext,
				structuredOutput: {
					schema: z.object({
						requirements: z.array(jobRequirementSchema).min(1),
					}),
				},
			},
		);

		return {
			applicationId: inputData.applicationId,
			requirements: result.object.requirements,
		};
	},
});

const persistJobConcepts = createStep({
	id: 'persist-job-concepts',
	description: 'Deterministically replaces the application job requirements',
	inputSchema: identifiedJobConceptsSchema,
	outputSchema,
	requestContextSchema: z.object({
		[MASTRA_AUTH_TOKEN_KEY]: z.string().min(1),
	}),
	execute: async ({ inputData, requestContext }) => {
		const token = (requestContext.get(MASTRA_AUTH_TOKEN_KEY) as string) ?? '';

		await withResumeBuilderTools(token, (tools) =>
			tools['create_job_requirements'].execute!(inputData, {} as any),
		);

		return { applicationId: inputData.applicationId };
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
	.then(persistJobConcepts)
	.commit();
