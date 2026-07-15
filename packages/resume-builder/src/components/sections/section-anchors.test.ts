import { describe, expect, it } from 'vitest';

import { getProjectAnchorId, RESUME_SECTION_IDS } from './section-anchors.ts';

describe('resume section anchors', () => {
	it('exposes the stable destinations supported by resume links', () => {
		expect(RESUME_SECTION_IDS).toEqual({
			contactInformation: 'contact-information',
			professionalSummary: 'professional-summary',
			workHistory: 'work-history',
			education: 'education',
			skills: 'skills',
			projects: 'projects',
			volunteering: 'volunteering',
		});
	});

	it('keeps every destination unique', () => {
		const ids = Object.values(RESUME_SECTION_IDS);

		expect(new Set(ids).size).toBe(ids.length);
	});

	it('builds stable project destinations from project IDs', () => {
		expect(getProjectAnchorId('507f1f77bcf86cd799439011', 0)).toBe(
			'project-507f1f77bcf86cd799439011',
		);
		expect(getProjectAnchorId('project/id with spaces', 0)).toBe(
			'project-project-id-with-spaces',
		);
	});

	it('provides a unique fallback for malformed legacy projects', () => {
		expect(getProjectAnchorId(undefined, 2)).toBe('project-legacy-3');
	});
});
