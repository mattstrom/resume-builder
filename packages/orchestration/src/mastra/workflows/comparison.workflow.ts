import { Agent } from '@mastra/core/agent';
import { MASTRA_AUTH_TOKEN_KEY } from '@mastra/core/request-context';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { jobSummarySchema } from '@resume-builder/entities';
import { outdent } from 'outdent';
import { z } from 'zod';

import config from '@/config';

import { createResumeBuilderMcpClient } from '../mcp/resume-builder.mcp';
import {
	careerContextBundleSchema,
	requirementMatchReportSchema,
} from '../schemas/comparison.schemas';
import { careerContextOutputSchema, careerContextWorkflow } from './career-context.workflow';

// careerContextWorkflow takes no input, so this wrapper adapts it to the
// { applicationId } input that .parallel() passes to every branch.
const careerContextBranch = createWorkflow({
	id: 'career-context-branch',
	description: 'Fetches the career context bundle',
	requestContextSchema: z.object({
		[MASTRA_AUTH_TOKEN_KEY]: z.string(),
	}),
	inputSchema: z.object({
		applicationId: z.string(),
	}),
	outputSchema: careerContextOutputSchema,
})
	.map(async () => ({}))
	.then(careerContextWorkflow);

careerContextBranch.commit();

const fetchApplicationStep = createStep({
	id: 'fetch-application',
	description: 'Fetches the application and its stored job summary via MCP',
	inputSchema: z.object({
		applicationId: z.string(),
	}),
	outputSchema: z.object({
		jobSummary: jobSummarySchema.nullable(),
		jobDescription: z.string(),
	}),
	requestContextSchema: z.object({
		[MASTRA_AUTH_TOKEN_KEY]: z.string(),
	}),
	execute: async ({ inputData, requestContext }) => {
		const { applicationId } = inputData;
		const token = requestContext.get(MASTRA_AUTH_TOKEN_KEY) ?? '';
		const mcpClient = createResumeBuilderMcpClient(token);
		const toolsets = await mcpClient.listToolsets();
		const result = await toolsets['resumeBuilder'].get_application.execute!(
			{ id: applicationId },
			{} as any,
		);

		const application = (result as any)?.application;

		if (!application) {
			throw new Error(`Application ${applicationId} not found`);
		}

		const storedSummary = jobSummarySchema.safeParse(application.jobSummary);
		const jobDescription = (application.jobDescription as string | undefined) ?? '';

		if (!storedSummary.success && !jobDescription) {
			throw new Error(
				`Application ${applicationId} has neither a job summary nor a job description`,
			);
		}

		return {
			jobSummary: storedSummary.success ? storedSummary.data : null,
			jobDescription,
		};
	},
});

const jobSummaryExtractorAgent = new Agent({
	id: 'jobSummaryExtractor',
	name: 'Job Summary Extractor',
	model: config.llms.defaultModel,
	instructions: outdent`
		You extract a job's requirements profile from a raw job description.
		Identify the skills, experience, education, role level, location policy,
		compensation, company stage, team size, and tech stack the posting calls
		for. Only report what the description actually states — do not infer or
		embellish.
	`,
});

const resolveJobSummaryStep = createStep({
	id: 'resolve-job-summary',
	description: 'Uses the stored job summary or extracts one from the job description',
	inputSchema: z.object({
		jobSummary: jobSummarySchema.nullable(),
		jobDescription: z.string(),
	}),
	outputSchema: z.object({
		jobSummary: jobSummarySchema,
	}),
	execute: async ({ inputData }) => {
		const { jobSummary, jobDescription } = inputData;

		if (jobSummary) {
			return { jobSummary };
		}

		const response = await jobSummaryExtractorAgent.generate(jobDescription, {
			structuredOutput: {
				schema: jobSummarySchema,
			},
		});

		return { jobSummary: response.object };
	},
});

const jobSummaryWorkflow = createWorkflow({
	id: 'job-summary-workflow',
	description: 'Resolves the job summary for an application',
	requestContextSchema: z.object({
		[MASTRA_AUTH_TOKEN_KEY]: z.string(),
	}),
	inputSchema: z.object({
		applicationId: z.string(),
	}),
	outputSchema: z.object({
		jobSummary: jobSummarySchema,
	}),
})
	.then(fetchApplicationStep)
	.then(resolveJobSummaryStep);

jobSummaryWorkflow.commit();

const COMPARISON_PROMPT = outdent`
	You are a career-fit analyst. You compare a candidate's career history
	against the requirements of a job and report how well each requirement is
	supported by real evidence from the candidate's background.

	You will receive a structured job summary and a career context bundle
	containing the candidate's jobs, projects, skills, education, volunteering,
	and profile.

	Treat each distinct item in the job summary — every required skill,
	preferred skill, tech stack entry, and the experience and education
	requirements — as a requirement to assess.

	For each requirement:
	- Cite only items that actually appear in the career context. Never invent
	  or embellish experience.
	- Rate support as "strong" when the career context shows direct,
	  demonstrated experience; "partial" when it shows adjacent or transferable
	  experience; and "none" when nothing supports it.
	- When support is partial or absent, note the gap.

	Finally, call out notable career strengths that no requirement asked for,
	and summarize the overall picture in a few sentences.
`;

const comparisonAgent = new Agent({
	id: 'comparisonAgent',
	name: 'Comparison Agent',
	model: config.llms.defaultModel,
	instructions: COMPARISON_PROMPT,
});

const compareFactsStep = createStep({
	id: 'compare-facts',
	description: 'Compares the career context against the job summary',
	// inputSchema: z.object({
	// 	jobSummary: jobSummarySchema,
	// 	careerContext: careerContextBundleSchema,
	// }),
	inputSchema: z.object({
		jobSummary: jobSummarySchema,
		careerContext: z.any(),
	}),
	outputSchema: requirementMatchReportSchema,
	execute: async ({ inputData }) => {
		const prompt = outdent`
			<job_summary>
			${JSON.stringify(inputData.jobSummary, null, 2)}
			</job_summary>

			<career_context>
			${JSON.stringify(inputData.careerContext, null, 2)}
			</career_context>
		`;

		const response = await comparisonAgent.generate(prompt, {
			structuredOutput: {
				schema: requirementMatchReportSchema,
			},
		});

		return response.object;
	},
});

const comparisonWorkflow = createWorkflow({
	id: 'comparison-workflow',
	description: 'Compare career context against job summary',
	requestContextSchema: z.object({
		[MASTRA_AUTH_TOKEN_KEY]: z.string(),
	}),
	inputSchema: z.object({
		applicationId: z.string(),
	}),
	outputSchema: requirementMatchReportSchema,
})
	.parallel([jobSummaryWorkflow, careerContextBranch])
	.map(async ({ inputData }) => {
		const { profile, education, jobs, projects, skills, volunteering } =
			inputData['career-context-branch'];

		return {
			jobSummary: inputData['job-summary-workflow'].jobSummary,
			careerContext: { profile, education, jobs, projects, skills, volunteering },
		};
	})
	.then(compareFactsStep);

comparisonWorkflow.commit();

export { comparisonWorkflow };
