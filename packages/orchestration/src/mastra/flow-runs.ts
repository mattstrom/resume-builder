import { MASTRA_AUTH_TOKEN_KEY } from '@mastra/core/request-context';

import { createResumeBuilderMcpClient } from './mcp/resume-builder.mcp';

/** Structural, so callers can pass a context typed with any schema. */
type TokenBearingContext = { get(key: string): unknown };

/** Mirrors the Flow enum in the backend schema. */
export type Flow =
	| 'jobDescriptionRetrieval'
	| 'jobConceptIdentification'
	| 'fitAssessment'
	| 'comparison'
	| 'conceptEvidenceEvaluation'
	| 'markupJobDescription'
	| 'backgroundAutofill'
	| 'bulletScoring'
	| 'bulletConceptAnnotation'
	| 'professionalStatementEvaluation'
	| 'narrativeDistillation'
	| 'careerContext'
	| 'factsExtraction';

export type FlowSubject =
	| 'application'
	| 'bullet'
	| 'job'
	| 'project'
	| 'skill'
	| 'volunteering'
	| 'professionalStatement'
	| 'profile';

export type FlowRunStatus = 'running' | 'success' | 'failed' | 'suspended' | 'canceled';

/**
 * Mastra reports more states than are worth rendering. Early exits (`bailed`,
 * `skipped`) are successful outcomes; `tripwire` is a failure; the waiting
 * states all read as "still going" to a user.
 */
export function toFlowRunStatus(status: string): FlowRunStatus {
	switch (status) {
		case 'success':
		case 'bailed':
		case 'skipped':
			return 'success';
		case 'failed':
		case 'tripwire':
			return 'failed';
		case 'suspended':
		case 'paused':
			return 'suspended';
		case 'canceled':
			return 'canceled';
		default:
			return 'running';
	}
}

export interface RecordFlowRunInput {
	flow: Flow;
	subjectType: FlowSubject;
	subjectId?: string;
	status: FlowRunStatus;
	runId?: string;
	error?: string;
	finishedAt?: string;
}

/**
 * Records run state on the backend. Recording is bookkeeping — a failure here
 * must not fail the run it is describing, so this resolves either way and logs
 * instead of throwing.
 */
export async function recordFlowRun(
	requestContext: TokenBearingContext,
	input: RecordFlowRunInput,
): Promise<void> {
	try {
		const token = (requestContext.get(MASTRA_AUTH_TOKEN_KEY) as string) ?? '';

		if (!token) {
			console.warn(`Skipping flow run record for ${input.flow}: no auth token in context`);
			return;
		}

		const { toolsets } = await createResumeBuilderMcpClient(token).listToolsetsWithErrors();
		const tools = toolsets['resumeBuilder'];

		await tools?.['upsert_flow_run'].execute!(input, {} as any);
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		console.warn(`Could not record flow run for ${input.flow}: ${reason}`);
	}
}
