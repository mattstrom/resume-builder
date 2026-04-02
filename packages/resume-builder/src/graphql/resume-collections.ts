export const ResumeCollections = {
	WORK_EXPERIENCE: 'WORK_EXPERIENCE',
	PROJECTS: 'PROJECTS',
	VOLUNTEERING: 'VOLUNTEERING',
} as const;

export type ResumeCollectionValue =
	(typeof ResumeCollections)[keyof typeof ResumeCollections];
