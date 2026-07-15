export const RESUME_SECTION_IDS = {
	contactInformation: 'contact-information',
	professionalSummary: 'professional-summary',
	workHistory: 'work-history',
	education: 'education',
	skills: 'skills',
	projects: 'projects',
	volunteering: 'volunteering',
} as const;

export type ResumeSectionId = (typeof RESUME_SECTION_IDS)[keyof typeof RESUME_SECTION_IDS];

function sanitizeAnchorToken(value: string): string {
	return value
		.trim()
		.replace(/[^A-Za-z\d_.:-]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Build the stable destination for a project entry. Persisted project IDs are
 * preferred; the index fallback only covers malformed legacy resume data.
 */
export function getProjectAnchorId(projectId: unknown, index: number): string {
	const token =
		(typeof projectId === 'string' || typeof projectId === 'number') &&
		sanitizeAnchorToken(String(projectId));

	return `project-${token || `legacy-${index + 1}`}`;
}
