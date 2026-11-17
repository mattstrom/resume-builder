export const ResumeCollections = {
	WORK_EXPERIENCE: 'WORK_EXPERIENCE',
	PROJECTS: 'PROJECTS',
	VOLUNTEERING: 'VOLUNTEERING',
	SELECTED_EXPERIENCE: 'SELECTED_EXPERIENCE',
} as const;

export type ResumeCollectionValue = (typeof ResumeCollections)[keyof typeof ResumeCollections];

export function getResumeCollectionPath(collection: ResumeCollectionValue): string {
	switch (collection) {
		case ResumeCollections.WORK_EXPERIENCE:
			return 'data.workExperience';
		case ResumeCollections.PROJECTS:
			return 'data.projects';
		case ResumeCollections.VOLUNTEERING:
			return 'data.volunteering';
		case ResumeCollections.SELECTED_EXPERIENCE:
			return 'data.selectedExperience';
	}
}
