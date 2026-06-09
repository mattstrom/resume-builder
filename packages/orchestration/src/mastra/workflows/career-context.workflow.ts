import { MASTRA_AUTH_TOKEN_KEY } from '@mastra/core/request-context';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import {
	PgJobSchema,
	projectSchema,
	skillSchema,
	volunteeringSchema,
} from '@resume-builder/entities';
import { z } from 'zod';

import { createResumeBuilderMcpClient } from '../mcp/resume-builder.mcp';

const fetchJobsStep = createStep({
	id: 'fetch-jobs',
	description: 'Fetches jobs via MCP',
	inputSchema: z.object({}),
	outputSchema: z.object({
		jobs: PgJobSchema,
	}),
	requestContextSchema: z.object({
		[MASTRA_AUTH_TOKEN_KEY]: z.string(),
	}),
	execute: async ({ requestContext }) => {
		const token = requestContext.get(MASTRA_AUTH_TOKEN_KEY) ?? '';
		const mcpClient = createResumeBuilderMcpClient(token);
		const toolsets = await mcpClient.listToolsets();
		const result = await toolsets['resumeBuilder'].get_jobs.execute!({} as any, {} as any);

		return {
			jobs: result.jobs,
		};
	},
});

const fetchProjectsStep = createStep({
	id: 'fetch-projects',
	description: 'Fetches projects via MCP',
	inputSchema: z.object({}),
	outputSchema: z.object({
		projects: projectSchema,
	}),
	requestContextSchema: z.object({
		[MASTRA_AUTH_TOKEN_KEY]: z.string(),
	}),
	execute: async ({ requestContext }) => {
		const token = requestContext.get(MASTRA_AUTH_TOKEN_KEY) ?? '';
		const mcpClient = createResumeBuilderMcpClient(token);
		const toolsets = await mcpClient.listToolsets();
		const result = await toolsets['resumeBuilder'].get_projects.execute!({} as any, {} as any);

		return {
			projects: result.projects,
		};
	},
});

const fetchSkillsStep = createStep({
	id: 'fetch-skills',
	description: 'Fetches skills via MCP',
	inputSchema: z.object({}),
	outputSchema: z.object({
		skills: skillSchema,
	}),
	requestContextSchema: z.object({
		[MASTRA_AUTH_TOKEN_KEY]: z.string(),
	}),
	execute: async ({ requestContext }) => {
		const token = requestContext.get(MASTRA_AUTH_TOKEN_KEY) ?? '';
		const mcpClient = createResumeBuilderMcpClient(token);
		const toolsets = await mcpClient.listToolsets();
		const result = await toolsets['resumeBuilder'].get_skills.execute!({} as any, {} as any);

		return {
			skills: result.skills,
		};
	},
});

const fetchVolunteeringStep = createStep({
	id: 'fetch-volunteering',
	description: 'Fetches volunteering experience via MCP',
	inputSchema: z.object({}),
	outputSchema: z.object({
		volunteering: volunteeringSchema,
	}),
	requestContextSchema: z.object({
		[MASTRA_AUTH_TOKEN_KEY]: z.string(),
	}),
	execute: async ({ requestContext }) => {
		const token = requestContext.get(MASTRA_AUTH_TOKEN_KEY) ?? '';
		const mcpClient = createResumeBuilderMcpClient(token);
		const toolsets = await mcpClient.listToolsets();
		const result = await toolsets['resumeBuilder'].get_volunteering.execute!(
			{} as any,
			{} as any,
		);

		return {
			volunteering: result.volunteering,
		};
	},
});

const careerContextWorkflow = createWorkflow({
	id: 'career-context-workflow',
	description:
		'Fetches career context data including jobs, projects, and volunteering experience',
	requestContextSchema: z.object({
		[MASTRA_AUTH_TOKEN_KEY]: z.string(),
	}),
	inputSchema: z.object({}),
	outputSchema: z.object({
		jobs: PgJobSchema,
		projects: projectSchema,
		skills: skillSchema,
		volunteering: volunteeringSchema,
	}),
})
	.parallel([fetchJobsStep, fetchProjectsStep, fetchSkillsStep, fetchVolunteeringStep])
	.map(async ({ inputData }) => {
		return {
			jobs: inputData['fetch-jobs'].jobs,
			projects: inputData['fetch-projects'].projects,
			skills: inputData['fetch-skills'].skills,
			volunteering: inputData['fetch-volunteering'].volunteering,
		};
	});

careerContextWorkflow.commit();

export { careerContextWorkflow };
