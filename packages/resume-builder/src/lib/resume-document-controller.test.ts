import { describe, expect, it } from 'vitest';
import type { Resume } from '@resume-builder/entities';
import { LocalResumeController } from './resume-document-controller.ts';
import { reorderItems } from './reorder.ts';

function createResume(): Resume {
	const createdAt = new Date('2024-01-01T00:00:00.000Z');
	const updatedAt = new Date('2024-01-02T00:00:00.000Z');

	return {
		_id: 'resume-1',
		uid: 'user-1',
		id: 'resume-1',
		name: 'Test Resume',
		company: 'Acme',
		level: 'Senior',
		jobPostingUrl: '',
		createdAt,
		updatedAt,
		data: {
			_id: 'content-1',
			name: 'Test Resume',
			title: 'Engineer',
			summary: 'Summary',
			contactInformation: {
				_id: 'contact-1',
				uid: 'user-1',
				location: '',
				phoneNumber: '',
				email: 'test@example.com',
				linkedInProfile: '',
				githubProfile: '',
				personalWebsite: '',
			},
			workExperience: [
				{
					_id: 'job-1',
					uid: 'user-1',
					company: 'Acme',
					position: 'First',
					location: '',
					startDate: '2022-01-01',
					endDate: '2022-12-31',
					responsibilities: ['One', 'Two'],
				},
				{
					_id: 'job-2',
					uid: 'user-1',
					company: 'Beta',
					position: 'Second',
					location: '',
					startDate: '2023-01-01',
					endDate: '2023-12-31',
					responsibilities: ['Three', 'Four'],
				},
			],
			education: [],
			skills: [],
			skillGroups: [
				{
					_id: 'group-1',
					uid: 'user-1',
					name: 'Languages',
					items: ['TypeScript', 'Go', 'Rust'],
				},
			],
			projects: [],
			volunteering: [],
		},
	};
}

describe('reorderItems', () => {
	it('moves an item forward', () => {
		expect(reorderItems(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
	});

	it('returns a copy for an invalid move', () => {
		const items = ['a', 'b'];
		const nextItems = reorderItems(items, -1, 1);

		expect(nextItems).toEqual(items);
		expect(nextItems).not.toBe(items);
	});
});

describe('LocalResumeController.moveArrayItem', () => {
	it('reorders collection items and supports undo/redo', () => {
		const controller = new LocalResumeController({
			resume: createResume(),
		});

		controller.moveArrayItem('data.workExperience', 0, 1);

		expect(
			controller
				.getSnapshot()
				?.data.workExperience.map((job) => job.position),
		).toEqual(['Second', 'First']);

		controller.undo();

		expect(
			controller
				.getSnapshot()
				?.data.workExperience.map((job) => job.position),
		).toEqual(['First', 'Second']);

		controller.redo();

		expect(
			controller
				.getSnapshot()
				?.data.workExperience.map((job) => job.position),
		).toEqual(['Second', 'First']);
	});

	it('reorders nested string arrays', () => {
		const controller = new LocalResumeController({
			resume: createResume(),
		});

		controller.moveArrayItem('data.skillGroups.0.items', 2, 0);

		expect(controller.getSnapshot()?.data.skillGroups?.[0]?.items).toEqual([
			'Rust',
			'TypeScript',
			'Go',
		]);
	});
});
