import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { z } from 'zod';

/**
 * A registered Mastra workflow. Members correspond 1:1 to the workflow ids in
 * the orchestration package, so triggering a run and recording it cannot drift.
 */
export enum Flow {
	JOB_DESCRIPTION_RETRIEVAL = 'jobDescriptionRetrieval',
	JOB_CONCEPT_IDENTIFICATION = 'jobConceptIdentification',
	FIT_ASSESSMENT = 'fitAssessment',
	COMPARISON = 'comparison',
	CONCEPT_EVIDENCE_EVALUATION = 'conceptEvidenceEvaluation',
	MARKUP_JOB_DESCRIPTION = 'markupJobDescription',
	BACKGROUND_AUTOFILL = 'backgroundAutofill',
	BULLET_SCORING = 'bulletScoring',
	BULLET_CONCEPT_ANNOTATION = 'bulletConceptAnnotation',
	PROFESSIONAL_STATEMENT_EVALUATION = 'professionalStatementEvaluation',
	NARRATIVE_DISTILLATION = 'narrativeDistillation',
	CAREER_CONTEXT = 'careerContext',
	FACTS_EXTRACTION = 'factsExtraction',
}

/**
 * What a run pertains to. `subjectId` is null for subjects that are not a
 * single row — a collection of the user's entities, or the user themselves.
 */
export enum FlowSubject {
	APPLICATION = 'application',
	BULLET = 'bullet',
	JOB = 'job',
	PROJECT = 'project',
	SKILL = 'skill',
	VOLUNTEERING = 'volunteering',
	PROFESSIONAL_STATEMENT = 'professionalStatement',
	PROFILE = 'profile',
}

/** Mastra's run statuses, collapsed to the states worth rendering. */
export enum FlowRunStatus {
	RUNNING = 'running',
	SUCCESS = 'success',
	FAILED = 'failed',
	SUSPENDED = 'suspended',
	CANCELED = 'canceled',
}

registerEnumType(Flow, { name: 'Flow' });
registerEnumType(FlowSubject, { name: 'FlowSubject' });
registerEnumType(FlowRunStatus, { name: 'FlowRunStatus' });

@ObjectType({ description: 'Summary of one Mastra workflow run against one subject' })
export class FlowRun {
	@Field(() => ID)
	id: string;

	@Field({ description: 'User ID' })
	uid: string;

	@Field(() => Flow, { description: 'Which workflow was run' })
	flow: Flow;

	@Field(() => FlowSubject, { description: 'What kind of thing the run pertains to' })
	subjectType: FlowSubject;

	@Field(() => ID, {
		nullable: true,
		description: 'The subject record, or null for collection- and user-scoped runs',
	})
	subjectId?: string;

	@Field(() => FlowRunStatus)
	status: FlowRunStatus;

	@Field({
		nullable: true,
		description: 'Mastra run ID — use it to fetch step-level detail',
	})
	runId?: string;

	@Field({ nullable: true, description: 'Failure summary, when the run failed' })
	error?: string;

	@Field()
	startedAt: Date;

	@Field({ nullable: true })
	finishedAt?: Date;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

export const flowSchema = z.enum(Flow);
export const flowSubjectSchema = z.enum(FlowSubject);
export const flowRunStatusSchema = z.enum(FlowRunStatus);

/** Everything a caller supplies when opening or closing out a run. */
export const flowRunUpsertSchema = z.object({
	flow: flowSchema,
	subjectType: flowSubjectSchema,
	subjectId: z.string().optional(),
	status: flowRunStatusSchema,
	runId: z.string().optional(),
	error: z.string().optional(),
	finishedAt: z.iso.datetime().optional(),
});

export type FlowRunUpsert = z.infer<typeof flowRunUpsertSchema>;
