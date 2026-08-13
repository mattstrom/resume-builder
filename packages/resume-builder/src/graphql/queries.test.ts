import { print } from 'graphql';
import { describe, expect, it } from 'vitest';

import { GET_APPLICATION, LIST_BASE_RESUMES } from './queries';

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
