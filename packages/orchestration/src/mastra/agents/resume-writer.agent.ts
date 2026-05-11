import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { applicationSchema, profileSchema } from '@resume-builder/entities';
import { z } from 'zod';
import { resumeBuilderMcpClient } from '../mcp/resume-builder.mcp';

export const resumeWriterAgent = new Agent({
	id: 'resume-writer',
	name: 'Resume Writer',
	model: 'anthropic/claude-sonnet-4-5',
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
	tools: async () => {
		const tools = await resumeBuilderMcpClient.listTools();

		return {
			...tools,
		};
	},
	scorers: {},
	memory: new Memory(),
});
