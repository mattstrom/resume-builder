import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { bulletScoringAgent } from '../agents/bullet-scoring.agent';
import { bulletScoreSchema } from '../schemas/bullet-scoring.schemas';

const scoreBulletStep = createStep({
	id: 'score-bullet',
	description: 'Scores one resume bullet for context, action, outcome, and clarity',
	inputSchema: z.object({
		bulletText: z.string().trim().min(1),
	}),
	outputSchema: bulletScoreSchema,
	execute: async ({ inputData }) => {
		const response = await bulletScoringAgent.generate(inputData.bulletText, {
			structuredOutput: {
				schema: bulletScoreSchema,
			},
			modelSettings: {
				temperature: 0,
				maxOutputTokens: 1500,
			},
		});

		return response.object;
	},
});

export const bulletScoringWorkflow = createWorkflow({
	id: 'bullet-scoring-workflow',
	description: 'Evaluates a resume bullet without revising it',
	inputSchema: z.object({
		bulletText: z.string().trim().min(1),
	}),
	outputSchema: bulletScoreSchema,
}).then(scoreBulletStep);

bulletScoringWorkflow.commit();
