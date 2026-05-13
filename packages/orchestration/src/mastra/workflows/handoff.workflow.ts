import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { narrativeCoachAgent } from '../agents/narrative-coach.agent';

const narrativeCoachStep = createStep(narrativeCoachAgent);

const handoffWorkflow = createWorkflow({
	id: 'handoff-workflow',
	inputSchema: z.object({
		scope: z.string().describe('The scope of the handoff'),
	}),
	outputSchema: z.object({
		scope: z.string().describe('The scope of the handoff'),
	}),
}).branch([[async ({ inputData }) => inputData.scope === 'narrativeCoach', narrativeCoachStep]]);

handoffWorkflow.commit();

export { handoffWorkflow };
