import { MASTRA_AUTH_TOKEN_KEY } from '@mastra/core/request-context';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { NarrativeNode, narrativeNodeSchema } from '@resume-builder/entities';
import { z } from 'zod';

import { withResumeBuilderTools } from '../../mcp/resume-builder.mcp';
import { segmentStep } from './segment.step';

const getNarrativeStep = createStep({
	id: 'get-narrative',
	description: 'Gets the narrative from the resume builder',
	requestContextSchema: z.object({
		[MASTRA_AUTH_TOKEN_KEY]: z.string(),
	}),
	inputSchema: z.object({}),
	outputSchema: z.object({
		narrative: z.array(narrativeNodeSchema),
	}),
	execute: async ({ requestContext }) => {
		const token = requestContext.get(MASTRA_AUTH_TOKEN_KEY) ?? '';
		const result = await withResumeBuilderTools(token, (tools) =>
			tools.get_profile.execute!({} as any, {} as any),
		);

		return {
			narrative: result.nodes as NarrativeNode[],
		};
	},
});

const narrativeDistillationWorkflow = createWorkflow({
	id: 'narrative-distillation-workflow',
	description: 'Distills facts and meaningful elements from career narrative',
	requestContextSchema: z.object({
		[MASTRA_AUTH_TOKEN_KEY]: z.string(),
	}),
	inputSchema: z.object({}),
	outputSchema: z.any(),
})
	.then(getNarrativeStep)
	.then(segmentStep);

narrativeDistillationWorkflow.commit();

export { narrativeDistillationWorkflow };
