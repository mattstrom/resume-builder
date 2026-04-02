type ResumeLike = {
	_id: { toString(): string } | string;
	uid: string;
	name?: string;
	company?: string;
	jobPostingUrl?: string;
};

type ApplicationLike = {
	uid: string;
	resumeId?: { toString(): string } | string | null;
};

export type ApplicationBackfillInsert = {
	uid: string;
	resumeId: string;
	name: string;
	company: string;
	jobPostingUrl: string;
};

export function getResumeAttachmentKey(uid: string, resumeId: string): string {
	return `${uid}:${resumeId}`;
}

export function getAttachedResumeKeys(
	applications: ApplicationLike[],
): Set<string> {
	return new Set(
		applications
			.filter((application) => application.resumeId != null)
			.map((application) =>
				getResumeAttachmentKey(
					application.uid,
					application.resumeId!.toString(),
				),
			),
	);
}

export function buildApplicationBackfillInserts(
	resumes: ResumeLike[],
	applications: ApplicationLike[],
): ApplicationBackfillInsert[] {
	const attachedResumeKeys = getAttachedResumeKeys(applications);

	return resumes
		.filter((resume) => {
			const resumeId = resume._id.toString();
			return !attachedResumeKeys.has(
				getResumeAttachmentKey(resume.uid, resumeId),
			);
		})
		.map((resume) => ({
			uid: resume.uid,
			resumeId: resume._id.toString(),
			name: resume.name ?? '',
			company: resume.company ?? '',
			jobPostingUrl: resume.jobPostingUrl ?? '',
		}));
}
