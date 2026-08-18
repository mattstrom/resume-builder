import { MASTRA_AUTH_TOKEN_KEY } from '@mastra/core/request-context';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { outdent } from 'outdent';
import { z } from 'zod';

import { backgroundAutofillAgent } from '../agents/background-autofill.agent';
import { withResumeBuilderTools } from '../mcp/resume-builder.mcp';

const entityTypeSchema = z.enum(['jobs', 'projects', 'skills', 'volunteering']);

const fetchExistingData = createStep({
	id: 'fetch-existing-data',
	description: 'Fetches the career narrative and existing entities of the requested type via MCP',
	inputSchema: z.object({
		entityType: entityTypeSchema,
	}),
	outputSchema: z.object({
		entityType: entityTypeSchema,
		narrativeText: z.string(),
		existingEntities: z.array(z.record(z.string(), z.unknown())),
	}),
	execute: async ({ inputData, requestContext }) => {
		const { entityType } = inputData;
		const token = (requestContext.get(MASTRA_AUTH_TOKEN_KEY) as string) ?? '';

		const getToolName =
			entityType === 'jobs'
				? 'get_jobs'
				: entityType === 'projects'
					? 'get_projects'
					: entityType === 'skills'
						? 'get_skills'
						: 'get_volunteering';

		const [narrativeResult, entitiesResult] = await withResumeBuilderTools(token, (tools) =>
			Promise.all([
				tools['read_narrative'].execute!({} as any, {} as any),
				tools[getToolName].execute!({} as any, {} as any),
			]),
		);

		const narrativeText = (narrativeResult as any)?.content?.[0]?.text ?? '';
		const entitiesKey = entityType === 'jobs' ? 'jobs' : entityType;
		const existingEntities =
			((entitiesResult as any)?.structuredContent?.[entitiesKey] as Record<
				string,
				unknown
			>[]) ?? [];

		return { entityType, narrativeText, existingEntities };
	},
});

const extractAndCreate = createStep({
	id: 'extract-and-create',
	description:
		'Calls the background autofill agent to extract new entities from the narrative and create them via MCP',
	inputSchema: z.object({
		entityType: entityTypeSchema,
		narrativeText: z.string(),
		existingEntities: z.array(z.record(z.string(), z.unknown())),
	}),
	outputSchema: z.object({
		message: z.string(),
	}),
	execute: async ({ inputData, requestContext, mastra }) => {
		const { entityType, existingEntities } = inputData;

		const agent = mastra?.getAgent('backgroundAutofill') ?? backgroundAutofillAgent;

		const prompt = outdent`
			Extract and create new **${entityType}** from the career narrative below.

			Existing ${entityType} already in the database (do NOT recreate these):
			${JSON.stringify(existingEntities, null, 2)}

			The narrative is already available via the read_narrative tool. Use it to get the full text with node indices, then proceed to extract and create new ${entityType} that are not already in the list above.
		`;

		const result = await agent.generate([{ role: 'user', content: prompt }], {
			maxSteps: 20,
			requestContext,
		});

		return { message: result.text ?? 'Done' };
	},
});

const backgroundAutofillWorkflow = createWorkflow({
	id: 'backgroundAutofillWorkflow',
	inputSchema: z.object({
		entityType: entityTypeSchema,
	}),
	outputSchema: z.object({
		message: z.string(),
	}),
})
	.then(fetchExistingData)
	.then(extractAndCreate);

backgroundAutofillWorkflow.commit();

export { backgroundAutofillWorkflow };
