import type { Application } from '@resume-builder/entities';
import { describe, expect, it } from 'vitest';
import { HomePageStore } from './home-page.store.ts';

function createApplication(
	overrides: Partial<Application> & Pick<Application, '_id' | 'name'>,
): Application {
	const date = new Date('2024-01-01T10:00:00.000Z');

	return {
		_id: overrides._id,
		uid: 'user-1',
		name: overrides.name,
		company: overrides.company ?? '',
		jobPostingUrl: overrides.jobPostingUrl ?? '',
		jobDescription: overrides.jobDescription ?? '',
		coverLetterId: overrides.coverLetterId,
		notionId: overrides.notionId,
		notes: overrides.notes ?? '',
		createdAt: overrides.createdAt ?? date,
		updatedAt: overrides.updatedAt ?? date,
		jobSummary: overrides.jobSummary,
		analysis: overrides.analysis,
		resumes: overrides.resumes ?? [],
	};
}

describe('HomePageStore', () => {
	it('sorts applications by most recent update first', () => {
		const store = new HomePageStore(
			{ user: {} },
			{
				data: [
					createApplication({
						_id: 'older',
						name: 'Older',
						updatedAt: new Date('2024-01-01T00:00:00.000Z'),
					}),
					createApplication({
						_id: 'newer',
						name: 'Newer',
						updatedAt: new Date('2024-02-01T00:00:00.000Z'),
					}),
				],
			},
		);

		expect(store.sortedApplications.map((item) => item._id)).toEqual([
			'newer',
			'older',
		]);
		expect(store.continueApplication?._id).toBe('newer');
	});

	it('computes homepage summary values', () => {
		const store = new HomePageStore(
			{ user: {} },
			{
				data: [
					createApplication({
						_id: '1',
						name: 'Frontend Engineer',
						company: 'Acme',
						resumes: [{ _id: 'resume-1' }],
					}),
					createApplication({
						_id: '2',
						name: 'Staff Engineer',
						company: ' Acme ',
					}),
					createApplication({
						_id: '3',
						name: 'Platform Engineer',
						company: 'Beta',
						resumes: [{ _id: 'resume-3' }],
					}),
				],
			},
		);

		expect(store.summary).toEqual({
			totalApplications: 3,
			applicationsWithResume: 2,
			distinctCompanies: 2,
		});
	});

	it('derives the first name from the authenticated user', () => {
		expect(
			new HomePageStore(
				{ user: { given_name: 'Matt', name: 'Matt Strom' } },
				{ data: [] },
			).firstName,
		).toBe('Matt');

		expect(
			new HomePageStore({ user: { name: 'Matt Strom' } }, { data: [] })
				.firstName,
		).toBe('Matt');
	});

	it('normalizes company labels and formats dates', () => {
		const store = new HomePageStore({ user: {} }, { data: [] });

		expect(store.normalizeCompany('')).toBe('No company');
		expect(store.normalizeCompany('   ')).toBe('No company');
		expect(store.normalizeCompany(undefined)).toBe('No company');
		expect(
			store.formatApplicationUpdatedAt(
				new Date('2024-01-01T10:00:00.000Z'),
			),
		).toMatch(/2024|Jan|January/);
	});
});
