import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { bulletConceptAnnotatorAgent } from '../agents/bullet-concept-annotator.agent';
import { bulletConceptAnnotationSchema } from '../schemas/bullet-concept-annotation.schemas';

const inputSchema = z.object({
	bulletText: z.string().trim().min(1),
});

const annotateBulletStep = createStep({
	id: 'annotate-bullet-concepts',
	description: 'Classifies the ontology concepts explicitly evidenced by one bullet',
	inputSchema,
	outputSchema: bulletConceptAnnotationSchema,
	execute: async ({ inputData }) => {
		const response = await bulletConceptAnnotatorAgent.generate(inputData.bulletText, {
			structuredOutput: { schema: bulletConceptAnnotationSchema },
			modelSettings: {
				temperature: 0,
				maxOutputTokens: 1800,
			},
		});

		return response.object;
	},
});

export const bulletConceptAnnotationWorkflow = createWorkflow({
	id: 'bullet-concept-annotation-workflow',
	description: 'Builds a validated semantic concept graph for one resume bullet',
	inputSchema,
	outputSchema: bulletConceptAnnotationSchema,
})
	.then(annotateBulletStep)
	.commit();
