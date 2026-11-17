import type { ResumeSectionKey } from '@resume-builder/entities';
import { describe, expect, it } from 'vitest';

import { moveSection, orderSectionKeys } from './section-order.ts';

const ALL: ResumeSectionKey[] = [
	'summary',
	'selected-experience',
	'work-experience',
	'education',
	'skills',
	'projects',
	'volunteer-experiences',
];

describe('orderSectionKeys', () => {
	it('uses the default order when the resume has none', () => {
		// Arrange
		const order = undefined;

		// Act
		const keys = orderSectionKeys(order, ALL);

		// Assert
		expect(keys).toEqual(ALL);
	});

	it('sorts a layout region by the resume order', () => {
		// Arrange
		const order: ResumeSectionKey[] = ['skills', 'projects', 'education', 'summary'];

		// Act
		const keys = orderSectionKeys(order, ['education', 'skills']);

		// Assert
		expect(keys).toEqual(['skills', 'education']);
	});
});

describe('moveSection', () => {
	it('moves a section down past its neighbour', () => {
		// Arrange
		const order = ALL;

		// Act
		const next = moveSection(order, 'summary', 1, ALL);

		// Assert
		expect(next?.slice(0, 3)).toEqual(['selected-experience', 'summary', 'work-experience']);
	});

	it('moves a section up past its neighbour', () => {
		// Arrange
		const order = ALL;

		// Act
		const next = moveSection(order, 'projects', -1, ALL);

		// Assert
		expect(next?.slice(3, 6)).toEqual(['education', 'projects', 'skills']);
	});

	it('refuses to move the first section up or the last section down', () => {
		// Arrange
		const order = ALL;

		// Act
		const up = moveSection(order, 'summary', -1, ALL);
		const down = moveSection(order, 'volunteer-experiences', 1, ALL);

		// Assert
		expect(up).toBeNull();
		expect(down).toBeNull();
	});

	it('steps over sections rendered in another layout region', () => {
		// Arrange
		const region: ResumeSectionKey[] = ['summary', 'work-experience', 'projects'];

		// Act
		const next = moveSection(ALL, 'work-experience', 1, region);

		// Assert
		expect(next).toEqual([
			'summary',
			'selected-experience',
			'education',
			'skills',
			'projects',
			'work-experience',
			'volunteer-experiences',
		]);
	});

	it('ignores a section that is not in the region', () => {
		// Arrange
		const region: ResumeSectionKey[] = ['summary', 'work-experience'];

		// Act
		const next = moveSection(ALL, 'skills', 1, region);

		// Assert
		expect(next).toBeNull();
	});
});
