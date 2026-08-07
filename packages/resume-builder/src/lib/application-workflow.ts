import type { Application } from '@resume-builder/entities';

export const WORKFLOW_STAGE_IDS = [
	'posting',
	'requirements',
	'resume',
	'coverLetter',
	'review',
] as const;

export type WorkflowStageId = (typeof WORKFLOW_STAGE_IDS)[number];

export type WorkflowStageStatus = 'empty' | 'ready' | 'inProgress' | 'complete' | 'blocked';

export interface WorkflowStage {
	id: WorkflowStageId;
	label: string;
	status: WorkflowStageStatus;
	description: string;
	actionLabel: string;
}

export interface ApplicationWorkflow {
	stages: WorkflowStage[];
	completedCount: number;
	totalCount: number;
	progress: number;
	hasPosting: boolean;
	hasJobDescription: boolean;
	hasRequirements: boolean;
	hasResume: boolean;
	hasCoverLetter: boolean;
	isReadyForReview: boolean;
}

export function deriveApplicationWorkflow(
	application: Application,
	hasRequirements = false,
): ApplicationWorkflow {
	const hasPosting = Boolean(
		application.jobDescription?.trim() || application.jobPostingUrl?.trim(),
	);
	const hasJobDescription = Boolean(application.jobDescription?.trim());
	const hasResume = (application.resumes?.length ?? 0) > 0;
	const hasCoverLetter = Boolean(application.coverLetterId?.trim());
	const isReadyForReview = hasPosting && hasRequirements && hasResume;

	const stages: WorkflowStage[] = [
		{
			id: 'posting',
			label: 'Posting',
			status: hasPosting ? 'complete' : 'ready',
			description: hasPosting
				? 'Source material is available for this application.'
				: 'Add the posting URL or paste the job description.',
			actionLabel: hasPosting ? 'Update posting' : 'Add posting',
		},
		{
			id: 'requirements',
			label: 'Requirements',
			status: hasRequirements ? 'complete' : hasJobDescription ? 'ready' : 'blocked',
			description: hasRequirements
				? 'Job requirements have been distilled into concept assertions.'
				: hasJobDescription
					? 'Use AI to identify the role’s semantic requirements.'
					: 'Paste the job description before identifying requirements.',
			actionLabel: hasRequirements ? 'Re-identify requirements' : 'Identify requirements',
		},
		{
			id: 'resume',
			label: 'Resume',
			status: hasResume ? 'complete' : hasRequirements ? 'ready' : 'blocked',
			description: hasResume
				? 'At least one resume is linked to this application.'
				: hasRequirements
					? 'Create or clone a resume for this application.'
					: 'Identify requirements before preparing a resume.',
			actionLabel: hasResume ? 'Open resume' : 'Create resume',
		},
		{
			id: 'coverLetter',
			label: 'Cover Letter',
			status: hasCoverLetter ? 'complete' : hasResume ? 'ready' : 'empty',
			description: hasCoverLetter
				? 'A cover letter artifact is linked.'
				: 'Cover letter generation is not wired yet; track the artifact ID here.',
			actionLabel: hasCoverLetter ? 'Update cover letter' : 'Track cover letter',
		},
		{
			id: 'review',
			label: 'Final Review',
			status: isReadyForReview ? 'ready' : 'blocked',
			description: isReadyForReview
				? 'Core artifacts are ready for a final pass.'
				: 'Complete posting, requirements, and resume before final review.',
			actionLabel: 'Review package',
		},
	];

	const completedCount = stages.filter((stage) => stage.status === 'complete').length;

	return {
		stages,
		completedCount,
		totalCount: stages.length,
		progress: Math.round((completedCount / stages.length) * 100),
		hasPosting,
		hasJobDescription,
		hasRequirements,
		hasResume,
		hasCoverLetter,
		isReadyForReview,
	};
}
