import { print } from 'graphql';
import { describe, expect, it } from 'vitest';

import { GET_APPLICATION, LIST_BASE_RESUMES, SEARCH_RESUMES } from './queries';

describe('LIST_BASE_RESUMES', () => {
	it('fetches only summaries for resumes marked as base resumes', () => {
		const query = print(LIST_BASE_RESUMES);

		expect(query).toContain('listResumes(filter: {base: true})');
		expect(query).toContain('_id');
		expect(query).toContain('name');
		expect(query).toContain('base');
		expect(query).not.toContain('data {');
	});
});

describe('GET_APPLICATION', () => {
	it('fetches the granular preference-fit explanations', () => {
		const query = print(GET_APPLICATION);

		for (const field of [
			'roleLevelFitExplanation',
			'locationFitExplanation',
			'compensationFitExplanation',
			'companyFitExplanation',
		]) {
			expect(query).toContain(field);
		}
	});
});

describe('SEARCH_RESUMES', () => {
	it('requests lightweight ranked resume search metadata', () => {
		const query = print(SEARCH_RESUMES);
		expect(query).toContain('searchResumes(query: $query, limit: $limit)');
		expect(query).toContain('dominantTheme');
		expect(query).toContain('technologies');
		expect(query).toContain('matches');
		expect(query).not.toContain('xml');
		expect(query).not.toContain('data {');
	});
});
