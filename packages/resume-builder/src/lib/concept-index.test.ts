import { type BulletConcept, BulletSourceType } from '@resume-builder/entities';
import { describe, expect, it } from 'vitest';

import { buildConceptIndex, filterConceptIndex, type ConceptIndexBullet } from './concept-index.ts';

function conceptLink(
	bulletId: string,
	conceptId: string,
	label: string,
	vocabulary: string,
	relation: string,
): BulletConcept {
	return {
		bulletId,
		conceptId,
		relation,
		source: 'user',
		concept: { id: conceptId, key: label.toLocaleLowerCase(), label, vocabulary },
	};
}

const bullets: ConceptIndexBullet[] = [
	{
		id: 'bullet-1',
		text: 'Built a React application',
		sourceType: BulletSourceType.JOB,
		sourceId: 'job-1',
		status: 'ready',
		concepts: [conceptLink('bullet-1', 'react', 'React', 'technology', 'uses')],
	},
	{
		id: 'bullet-2',
		text: 'Mentored five engineers using React',
		sourceType: BulletSourceType.JOB,
		sourceId: 'job-2',
		status: 'draft',
		concepts: [
			conceptLink('bullet-2', 'mentoring', 'Mentoring', 'capability', 'demonstrates'),
			conceptLink('bullet-2', 'react', 'React', 'technology', 'uses'),
		],
	},
];

describe('concept index', () => {
	it('groups every supporting bullet under its concept', () => {
		const index = buildConceptIndex(bullets);

		expect(index.map(({ concept }) => concept.label)).toEqual(['Mentoring', 'React']);
		expect(index.find(({ concept }) => concept.id === 'react')?.bullets).toHaveLength(2);
	});

	it('keeps all bullets when the concept itself matches the search', () => {
		const filtered = filterConceptIndex(buildConceptIndex(bullets), 'React');

		expect(filtered).toHaveLength(1);
		expect(filtered[0].bullets).toHaveLength(2);
	});

	it('narrows bullet evidence when only bullet text matches the search', () => {
		const filtered = filterConceptIndex(buildConceptIndex(bullets), 'five engineers');

		expect(filtered).toHaveLength(2);
		expect(filtered.every((usage) => usage.bullets[0].bullet.id === 'bullet-2')).toBe(true);
	});
});
