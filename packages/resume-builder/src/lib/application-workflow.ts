import type { Application } from '@resume-builder/entities';

export type WorkflowStageId = 'posting' | 'fit' | 'resume' | 'coverLetter' | 'review';

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
	hasAnalysis: boolean;
	hasResume: boolean;
	hasCoverLetter: boolean;
	isReadyForReview: boolean;
}

export function deriveApplicationWorkflow(application: Application): ApplicationWorkflow {
	const hasPosting = Boolean(
		application.jobDescription?.trim() || application.jobPostingUrl?.trim(),
	);
	const hasAnalysis = Boolean(application.jobSummary || application.analysis);
	const hasResume = (application.resumes?.length ?? 0) > 0;
	const hasCoverLetter = Boolean(application.coverLetterId?.trim());
	const isReadyForReview = hasPosting && hasAnalysis && hasResume;

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
			id: 'fit',
			label: 'Fit',
			status: hasAnalysis ? 'complete' : hasPosting ? 'ready' : 'blocked',
			description: hasAnalysis
				? 'Fit analysis is available.'
				: hasPosting
					? 'Run the assessment against the saved posting.'
					: 'Add posting details before running assessment.',
			actionLabel: hasAnalysis ? 'Re-run assessment' : 'Run assessment',
		},
		{
			id: 'resume',
			label: 'Resume',
			status: hasResume ? 'complete' : hasPosting ? 'ready' : 'blocked',
			description: hasResume
				? 'At least one resume is linked to this application.'
				: hasPosting
					? 'Create or clone a resume for this application.'
					: 'Add posting details before preparing a resume.',
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
				: 'Complete posting, fit, and resume before final review.',
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
		hasAnalysis,
		hasResume,
		hasCoverLetter,
		isReadyForReview,
	};
}
