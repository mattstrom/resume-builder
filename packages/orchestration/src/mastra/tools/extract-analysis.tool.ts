import { createTool } from '@mastra/core/tools';

import { analysisSchema } from '../schemas/fit-assessment.schemas';

export const extractAnalysisTool = createTool({
	id: 'extract_analysis',
	description:
		'Analyze the fit between a candidate resume and job requirements using the scoring rubric.',
	inputSchema: analysisSchema,
	outputSchema: analysisSchema,
	execute: async (inputData) => inputData,
});
