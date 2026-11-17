import { normalizeResumeSectionOrder, type ResumeSectionKey } from '@resume-builder/entities';

export const RESUME_SECTION_LABELS: Record<ResumeSectionKey, string> = {
	summary: 'Professional Summary',
	'selected-experience': 'Selected Experience',
	'work-experience': 'Work History',
	education: 'Education',
	skills: 'Skills',
	projects: 'Projects',
	'volunteer-experiences': 'Volunteering',
};

/** The sections of one layout region, sorted by the resume's section order. */
export function orderSectionKeys(
	order: readonly ResumeSectionKey[] | undefined,
	group: readonly ResumeSectionKey[],
): ResumeSectionKey[] {
	return normalizeResumeSectionOrder(order).filter((key) => group.includes(key));
}

/**
 * Move a section one step within its layout region. Sections rendered in other
 * regions are stepped over, so every move produces a visible change. Returns
 * the new complete order, or null when the section is already at that end.
 */
export function moveSection(
	order: readonly ResumeSectionKey[] | undefined,
	key: ResumeSectionKey,
	direction: -1 | 1,
	group: readonly ResumeSectionKey[],
): ResumeSectionKey[] | null {
	const region = orderSectionKeys(order, group);
	const neighbour = region[region.indexOf(key) + direction];
	if (!region.includes(key) || !neighbour) return null;

	const next = normalizeResumeSectionOrder(order).filter((candidate) => candidate !== key);
	next.splice(next.indexOf(neighbour) + (direction === 1 ? 1 : 0), 0, key);
	return next;
}
