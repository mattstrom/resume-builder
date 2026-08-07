import { MASTRA_AUTH_TOKEN_KEY } from '@mastra/core/request-context';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import {
	type ProfessionalStatementCheckpointEvaluation,
	professionalStatementEvaluationSchema,
} from '@resume-builder/entities';
import { outdent } from 'outdent';
import { z } from 'zod';

import { professionalStatementEvaluatorAgent } from '../agents/professional-statement-evaluator.agent';
import { createResumeBuilderMcpClient } from '../mcp/resume-builder.mcp';

const inputSchema = z.object({
	statement: z.string().trim().min(1).max(5000),
});

const profileContextSchema = z.object({
	narrative: z.string(),
	narrativeSummary: z.unknown().nullable(),
	jobPreferences: z.record(z.string(), z.unknown()),
});

const preparedEvaluationSchema = z.object({
	statement: z.string(),
	profileContext: profileContextSchema,
	hasAuthenticityContext: z.boolean(),
});

const rawCheckpointSchema = z.object({
	score: z.union([
		z.literal(0),
		z.literal(0.25),
		z.literal(0.5),
		z.literal(0.75),
		z.literal(1),
	]),
	confidence: z.number().min(0).max(1),
	evidence: z.array(z.string().trim().min(1)).max(3),
	feedback: z.string().trim().min(1),
});

const rawEvaluationSchema = z.object({
	summary: z.string().trim().min(1),
	checkpoints: z.object({
		whoYouAre: rawCheckpointSchema,
		yourFoundation: rawCheckpointSchema,
		whatYouDo: rawCheckpointSchema,
		yourImpact: rawCheckpointSchema,
		yourWhy: rawCheckpointSchema,
		authenticity: rawCheckpointSchema,
	}),
});

const fetchEvaluationContextStep = createStep({
	id: 'fetch-professional-statement-evaluation-context',
	description: 'Fetches the candidate context used to evaluate authenticity',
	inputSchema,
	outputSchema: preparedEvaluationSchema,
	requestContextSchema: z.object({
		[MASTRA_AUTH_TOKEN_KEY]: z.string(),
	}),
	execute: async ({ inputData, requestContext }) => {
		const token = requestContext.get(MASTRA_AUTH_TOKEN_KEY) ?? '';
		const mcpClient = createResumeBuilderMcpClient(token);
		const toolsets = await mcpClient.listToolsets();
		const result = await toolsets['resumeBuilder'].get_profile.execute!(
			{} as any,
			{} as any,
		);
		const profile =
			typeof result.profile === 'object' && result.profile !== null
				? (result.profile as Record<string, unknown>)
				: {};
		const narrative =
			typeof profile.narrative === 'string' ? profile.narrative : '';
		const narrativeSummary = profile.narrativeSummary ?? null;
		const jobPreferences =
			typeof profile.jobPreferences === 'object' &&
			profile.jobPreferences !== null
				? (profile.jobPreferences as Record<string, unknown>)
				: {};
		const hasAuthenticityContext = Boolean(
			narrative.trim() ||
			narrativeSummary ||
			Object.keys(jobPreferences).length,
		);

		return {
			statement: inputData.statement,
			profileContext: {
				narrative: narrative.slice(0, 20_000),
				narrativeSummary,
				jobPreferences,
			},
			hasAuthenticityContext,
		};
	},
});

function statusForScore(
	score: number,
): ProfessionalStatementCheckpointEvaluation['status'] {
	if (score >= 0.75) {
		return 'met';
	}
	if (score > 0) {
		return 'partial';
	}
	return 'missing';
}

const evaluateStatementStep = createStep({
	id: 'evaluate-professional-statement',
	description:
		'Evaluates a statement against the six professional checkpoints',
	inputSchema: preparedEvaluationSchema,
	outputSchema: professionalStatementEvaluationSchema,
	execute: async ({ inputData }) => {
		const response = await professionalStatementEvaluatorAgent.generate(
			outdent`
				Candidate statement:
				${inputData.statement}

				Candidate profile context:
				${JSON.stringify(inputData.profileContext, null, 2)}
			`,
			{
				structuredOutput: { schema: rawEvaluationSchema },
				modelSettings: {
					temperature: 0,
					maxOutputTokens: 2200,
				},
			},
		);

		const checkpoints = Object.fromEntries(
			Object.entries(response.object.checkpoints).map(
				([key, checkpoint]) => [
					key,
					{
						...checkpoint,
						status:
							key === 'authenticity' &&
							!inputData.hasAuthenticityContext
								? 'insufficient-context'
								: statusForScore(checkpoint.score),
					},
				],
			),
		) as z.infer<
			typeof professionalStatementEvaluationSchema
		>['checkpoints'];
		const scoreValues = Object.values(checkpoints)
			.filter(({ status }) => status !== 'insufficient-context')
			.map(({ score }) => score);

		return professionalStatementEvaluationSchema.parse({
			overallScore:
				scoreValues.reduce((total, score) => total + score, 0) /
				scoreValues.length,
			summary: response.object.summary,
			checkpoints,
		});
	},
});

export const professionalStatementEvaluationWorkflow = createWorkflow({
	id: 'professional-statement-evaluation-workflow',
	description:
		'Evaluates a professional statement against six evidence-based checkpoints',
	requestContextSchema: z.object({
		[MASTRA_AUTH_TOKEN_KEY]: z.string(),
	}),
	inputSchema,
	outputSchema: professionalStatementEvaluationSchema,
})
	.then(fetchEvaluationContextStep)
	.then(evaluateStatementStep);

professionalStatementEvaluationWorkflow.commit();
