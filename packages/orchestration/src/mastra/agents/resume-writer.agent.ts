import { Agent } from '@mastra/core/agent';
import { MASTRA_AUTH_TOKEN_KEY } from '@mastra/core/request-context';
import { Memory } from '@mastra/memory';
import { applicationSchema, profileSchema } from '@resume-builder/entities';
import { z } from 'zod';

import { createResumeBuilderMcpClient } from '../mcp/resume-builder.mcp';

export const resumeWriterAgent = new Agent({
	id: 'resume-writer',
	name: 'Resume Writer',
	description: 'Create or prepare a tailored resume for a job application',
	model: 'anthropic/claude-sonnet-4-6',
	requestContextSchema: z.object({
		profile: profileSchema,
		application: applicationSchema,
	}),
	instructions: '',
	// instructions: async ({ mastra, requestContext }) => {
	// 	return [
	// 		outdent`
	// 			You are an expert resume preparer. When asked you will help prepare a resume for the given job description.
	//
	// 			Use the available tools to retrieve the candidate's information
	// 			(education, work history, skills, projects, etc.) as needed to
	// 			answer the user's questions. Do not guess — always
	// 			fetch the data using tools before responding.
	//
	// 			{{profileContext}}
	// 		`,
	// 		outdent`
	// 			Hello world
	// 		`,
	// 	];
	// },
	tools: async ({ requestContext }) => {
		const token = (requestContext.get(MASTRA_AUTH_TOKEN_KEY) as string) ?? '';
		const tools = await createResumeBuilderMcpClient(token).listTools();

		return {
			...tools,
		};
	},
	scorers: {},
	memory: new Memory(),
});
