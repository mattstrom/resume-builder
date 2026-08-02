import { describe, expect, it } from 'vitest';

import { looseKey, tightKey } from './labels.js';
import { vocabulary } from './vocabulary.js';

const fixture = vocabulary('test', {
	backend: { label: 'Backend' },
	'distributed-systems': {
		label: 'Distributed Systems',
		parent: 'backend',
		synonyms: ['distsys', 'Distributed Computing'],
	},
	consensus: { label: 'Consensus', parent: 'distributed-systems' },
	'ci-cd': { label: 'CI/CD', synonyms: ['Continuous Integration'] },
});

describe('label folding', () => {
	it('unifies separators in the loose form', () => {
		expect(looseKey('CI/CD')).toBe('ci-cd');
		expect(looseKey('CI CD')).toBe('ci-cd');
		expect(looseKey('  Distributed   Systems ')).toBe('distributed-systems');
	});

	it('keeps + and # so C, C++, and C# stay distinct', () => {
		expect(tightKey('C')).toBe('c');
		expect(tightKey('C++')).toBe('c++');
		expect(tightKey('C#')).toBe('c#');
	});

	it('drops remaining punctuation in the tight form', () => {
		expect(tightKey('Node.js')).toBe('nodejs');
		expect(tightKey('node-js')).toBe('nodejs');
		expect(tightKey('NodeJS')).toBe('nodejs');
	});

	it('strips diacritics', () => {
		expect(looseKey('Café')).toBe('cafe');
	});
});

describe('tree', () => {
	it('reports depth from the top', () => {
		expect(fixture.get('backend').depth).toBe(0);
		expect(fixture.get('distributed-systems').depth).toBe(1);
		expect(fixture.get('consensus').depth).toBe(2);
	});

	it('inverts parent into children', () => {
		expect(fixture.get('backend').children).toEqual(['distributed-systems']);
	});

	it('walks ancestors up to the top', () => {
		expect(fixture.ancestors('consensus')).toEqual(['distributed-systems', 'backend']);
	});

	it('collects descendants depth-first', () => {
		expect(fixture.descendants('backend')).toEqual(['distributed-systems', 'consensus']);
	});

	it('expands a concept to itself plus everything beneath it', () => {
		expect(fixture.expand('distributed-systems')).toEqual(['distributed-systems', 'consensus']);
	});

	it('answers containment', () => {
		expect(fixture.contains('backend', 'consensus')).toBe(true);
		expect(fixture.contains('backend', 'backend')).toBe(true);
		expect(fixture.contains('consensus', 'backend')).toBe(false);
	});

	it('lists only parentless concepts as roots', () => {
		expect(fixture.roots().map((concept) => concept.id)).toEqual(['backend', 'ci-cd']);
	});
});

describe('normalization', () => {
	it('matches the concept id itself', () => {
		expect(fixture.normalize('distributed-systems')).toBe('distributed-systems');
	});

	it('matches the display label', () => {
		expect(fixture.normalize('Distributed Systems')).toBe('distributed-systems');
	});

	it('matches synonyms case-insensitively', () => {
		expect(fixture.normalize('DistSys')).toBe('distributed-systems');
		expect(fixture.normalize('distributed computing')).toBe('distributed-systems');
	});

	it('matches across separator differences', () => {
		expect(fixture.normalize('CI/CD')).toBe('ci-cd');
		expect(fixture.normalize('ci cd')).toBe('ci-cd');
		expect(fixture.normalize('cicd')).toBe('ci-cd');
	});

	it('returns undefined for unknown labels', () => {
		expect(fixture.normalize('quantum tunnelling')).toBeUndefined();
	});

	it('reports matched and unmatched separately, deduplicating', () => {
		const report = fixture.normalizeAll(['DistSys', 'Distributed Systems', 'nonsense']);

		expect(report.resolved).toEqual(['distributed-systems']);
		expect(report.unresolved).toEqual(['nonsense']);
		expect(report.mapping).toEqual({
			DistSys: 'distributed-systems',
			'Distributed Systems': 'distributed-systems',
		});
	});
});

describe('derived artifacts', () => {
	it('builds a zod enum over the concept ids', () => {
		expect(fixture.zod.options).toEqual([
			'backend',
			'distributed-systems',
			'consensus',
			'ci-cd',
		]);
		expect(fixture.zod.safeParse('nonsense').success).toBe(false);
	});

	it('renders an indented markdown tree', () => {
		expect(fixture.prompt()).toBe(
			[
				'- `backend` — Backend',
				'  - `distributed-systems` — Distributed Systems',
				'    - `consensus` — Consensus',
				'- `ci-cd` — CI/CD',
			].join('\n'),
		);
	});

	it('can include synonyms and limit depth', () => {
		const rendered = fixture.prompt({ synonyms: true, maxDepth: 1 });

		expect(rendered).toContain('(aka distsys, Distributed Computing)');
		expect(rendered).not.toContain('consensus');
	});

	it('narrows to requested concepts and their parents', () => {
		const rendered = fixture.prompt({ only: ['consensus'] });

		expect(rendered).toContain('backend');
		expect(rendered).toContain('consensus');
		expect(rendered).not.toContain('ci-cd');
	});
});

describe('validation', () => {
	it('rejects an unknown parent', () => {
		expect(() => vocabulary('bad', { a: { label: 'A', parent: 'nope' as 'a' } })).toThrow(
			/unknown parent/,
		);
	});

	it('rejects a parent cycle', () => {
		expect(() =>
			vocabulary('bad', {
				a: { label: 'A', parent: 'b' },
				b: { label: 'B', parent: 'a' },
			}),
		).toThrow(/cycle in the parent chain/);
	});

	it('rejects an empty vocabulary', () => {
		expect(() => vocabulary('bad', {})).toThrow(/defines no concepts/);
	});

	it('does not let a synonym shadow another concept id', () => {
		const shadowed = vocabulary('shadow', {
			alpha: { label: 'Alpha', synonyms: ['beta'] },
			beta: { label: 'Beta' },
		});

		expect(shadowed.normalize('beta')).toBe('beta');
	});
});
