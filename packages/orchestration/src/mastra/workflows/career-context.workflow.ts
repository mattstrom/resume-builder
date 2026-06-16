import { MASTRA_AUTH_TOKEN_KEY } from '@mastra/core/request-context';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import {
	PgContactInformationSchema,
	PgEducationSchema,
	PgJobSchema,
	projectSchema,
	skillSchema,
	volunteeringSchema,
} from '@resume-builder/entities';
import { z } from 'zod';

import { createResumeBuilderMcpClient } from '../mcp/resume-builder.mcp';

const fetchProfileStep = createStep({
	id: 'fetch-profile',
	description: 'Fetches profile via MCP',
	inputSchema: z.object({}),
	outputSchema: z.object({
		profile: z.any(),
	}),
	requestContextSchema: z.object({
		[MASTRA_AUTH_TOKEN_KEY]: z.string(),
	}),
	execute: async ({ requestContext }) => {
		const token = requestContext.get(MASTRA_AUTH_TOKEN_KEY) ?? '';
		const mcpClient = createResumeBuilderMcpClient(token);
		const toolsets = await mcpClient.listToolsets();
		const result = await toolsets['resumeBuilder'].get_profile.execute!({} as any, {} as any);

		return {
			profile: result.profile,
		};
	},
});

const fetchContactInformationStep = createStep({
	id: 'fetch-contact-information',
	description: 'Fetches contact information via MCP',
	inputSchema: z.object({}),
	outputSchema: z.object({
		contactInformation: PgContactInformationSchema,
	}),
	requestContextSchema: z.object({
		[MASTRA_AUTH_TOKEN_KEY]: z.string(),
	}),
	execute: async ({ requestContext }) => {
		const token = requestContext.get(MASTRA_AUTH_TOKEN_KEY) ?? '';
		const mcpClient = createResumeBuilderMcpClient(token);
		const toolsets = await mcpClient.listToolsets();
		const result = await toolsets['resumeBuilder'].get_contact_information.execute!(
			{} as any,
			{} as any,
		);

		return {
			contactInformation: result.contactInformation,
		};
	},
});

const fetchEducationStep = createStep({
	id: 'fetch-education',
	description: 'Fetches education via MCP',
	inputSchema: z.object({}),
	outputSchema: z.object({
		education: z.array(PgEducationSchema),
	}),
	requestContextSchema: z.object({
		[MASTRA_AUTH_TOKEN_KEY]: z.string(),
	}),
	execute: async ({ requestContext }) => {
		const token = requestContext.get(MASTRA_AUTH_TOKEN_KEY) ?? '';
		const mcpClient = createResumeBuilderMcpClient(token);
		const toolsets = await mcpClient.listToolsets();
		const result = await toolsets['resumeBuilder'].get_education.execute!({} as any, {} as any);

		return {
			education: result.education,
		};
	},
});

const fetchJobsStep = createStep({
	id: 'fetch-jobs',
	description: 'Fetches jobs via MCP',
	inputSchema: z.object({}),
	outputSchema: z.object({
		jobs: z.array(PgJobSchema),
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
		projects: z.array(projectSchema),
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
		skills: z.array(skillSchema),
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
		volunteering: z.array(volunteeringSchema),
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

const careerContextOutputSchema = z.object({
	profile: z.any(),
	contactInformation: PgContactInformationSchema,
	education: z.array(PgEducationSchema),
	jobs: z.array(PgJobSchema),
	projects: z.array(projectSchema),
	skills: z.array(skillSchema),
	volunteering: z.array(volunteeringSchema),
});

const careerContextWorkflow = createWorkflow({
	id: 'career-context-workflow',
	description:
		'Fetches career context data including jobs, projects, and volunteering experience',
	requestContextSchema: z.object({
		[MASTRA_AUTH_TOKEN_KEY]: z.string(),
	}),
	inputSchema: z.object({}),
	outputSchema: careerContextOutputSchema,
})
	.parallel([
		fetchProfileStep,
		fetchContactInformationStep,
		fetchEducationStep,
		fetchJobsStep,
		fetchProjectsStep,
		fetchSkillsStep,
		fetchVolunteeringStep,
	])
	.map(async ({ inputData }) => {
		return {
			profile: inputData['fetch-profile'].profile,
			contactInformation: inputData['fetch-contact-information'].contactInformation,
			education: inputData['fetch-education'].education,
			jobs: inputData['fetch-jobs'].jobs,
			projects: inputData['fetch-projects'].projects,
			skills: inputData['fetch-skills'].skills,
			volunteering: inputData['fetch-volunteering'].volunteering,
		};
	});

careerContextWorkflow.commit();

export { careerContextOutputSchema, careerContextWorkflow };
