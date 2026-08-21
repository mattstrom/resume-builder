import { describe, expect, it } from 'vitest';

import { resumeSummarySchema } from './resume.js';

describe('resumeSummarySchema', () => {
	it('accepts a search-oriented resume summary', () => {
		expect(
			resumeSummarySchema.parse({
				dominantTheme: 'backend/platform engineering',
				summaryTheme: 'Reliable distributed systems and technical leadership',
				projects: [
					{
						name: 'Job Queue Service',
						description: 'Processes background work with BullMQ and Redis.',
					},
				],
				technologies: ['TypeScript', 'BullMQ', 'Redis'],
				contentThemes: ['distributed systems', 'developer tooling'],
			}),
		).toMatchObject({ dominantTheme: 'backend/platform engineering' });
	});

	it('rejects empty retrieval terms', () => {
		expect(() =>
			resumeSummarySchema.parse({
				dominantTheme: '',
				summaryTheme: 'Leadership',
				projects: [],
				technologies: [],
				contentThemes: [],
			}),
		).toThrow();
	});
});
