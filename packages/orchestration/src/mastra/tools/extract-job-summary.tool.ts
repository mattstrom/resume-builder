import { createTool } from '@mastra/core/tools';
import { jobSummarySchema } from '@resume-builder/entities';

export const extractJobSummaryTool = createTool({
	id: 'extract_job_summary',
	description:
		'Extract a structured summary of job requirements from the posting.',
	inputSchema: jobSummarySchema,
	outputSchema: jobSummarySchema,
	execute: async (inputData) => inputData,
});
