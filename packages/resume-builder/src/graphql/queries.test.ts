import { print } from 'graphql';
import { describe, expect, it } from 'vitest';

import { LIST_BASE_RESUMES } from './queries';

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
