import { MASTRA_AUTH_TOKEN_KEY } from '@mastra/core/request-context';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { factsExtractorAgent } from '../agents/facts-extractor.agent';

const extractionSummarySchema = z.object({
	created: z.number().int().nonnegative(),
	updated: z.number().int().nonnegative(),
	skipped: z.number().int().nonnegative(),
	summary: z.string(),
});

const extractFacts = createStep(factsExtractorAgent, {
	structuredOutput: { schema: extractionSummarySchema },
});

export const factsExtractionWorkflow = createWorkflow({
	id: 'facts-extraction-workflow',
	description: 'Extracts an evidence graph from the career narrative',
	requestContextSchema: z.object({
		[MASTRA_AUTH_TOKEN_KEY]: z.string(),
	}),
	inputSchema: z.object({
		prompt: z.string(),
	}),
	outputSchema: extractionSummarySchema,
})
	.then(extractFacts)
	.commit();
