import type { Resume } from '@resume-builder/entities';
import { describe, expect, it } from 'vitest';

import { getProjectAnchorId } from '../components/sections/section-anchors.ts';
import { ResumeCollections } from '../graphql/resume-collections.ts';
import { reorderItems } from './reorder.ts';
import { LocalResumeController } from './resume-document-controller.ts';

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
					responsibilities: [
						{ _id: 'bullet-local-1', text: 'One', bulletId: 'bank-1' },
						{ _id: 'bullet-local-2', text: 'Two' },
					],
				},
				{
					_id: 'job-2',
					uid: 'user-1',
					company: 'Beta',
					position: 'Second',
					location: '',
					startDate: '2023-01-01',
					endDate: '2023-12-31',
					responsibilities: [
						{ _id: 'bullet-local-3', text: 'Three' },
						{ _id: 'bullet-local-4', text: 'Four' },
					],
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

		expect(controller.getSnapshot()?.data.workExperience.map((job) => job.position)).toEqual([
			'Second',
			'First',
		]);

		controller.undo();

		expect(controller.getSnapshot()?.data.workExperience.map((job) => job.position)).toEqual([
			'First',
			'Second',
		]);

		controller.redo();

		expect(controller.getSnapshot()?.data.workExperience.map((job) => job.position)).toEqual([
			'Second',
			'First',
		]);
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

	it('preserves bullet identity and provenance through edits and reordering', () => {
		const controller = new LocalResumeController({ resume: createResume() });

		controller.setField('data.workExperience.0.responsibilities.0.text', 'Updated text');
		controller.moveArrayItem('data.workExperience.0.responsibilities', 0, 1);

		const bullets = controller.getSnapshot()?.data.workExperience[0]?.responsibilities;
		expect(bullets).toEqual([
			{ _id: 'bullet-local-2', text: 'Two' },
			{ _id: 'bullet-local-1', text: 'Updated text', bulletId: 'bank-1' },
		]);
		expect(controller.getXml()).toContain(
			'<responsibility xml:id="bullet-local-1" bullet-id="bank-1">Updated text</responsibility>',
		);
	});
});

describe('LocalResumeController.insertCollectionItem', () => {
	it('assigns new projects an ID that can be used as a stable link destination', () => {
		const controller = new LocalResumeController({
			resume: createResume(),
		});

		controller.insertCollectionItem(ResumeCollections.PROJECTS, 0);

		const project = controller.getSnapshot()?.data.projects[0];
		expect(project?._id).toEqual(expect.any(String));
		expect(getProjectAnchorId(project?._id, 0)).toMatch(/^project-[\w.-]+$/);
	});

	it('inserts a new item at the given index and supports undo', () => {
		const controller = new LocalResumeController({
			resume: createResume(),
		});

		controller.insertCollectionItem(ResumeCollections.WORK_EXPERIENCE, 1);

		expect(controller.getSnapshot()?.data.workExperience.map((job) => job.position)).toEqual([
			'First',
			'New Role',
			'Second',
		]);

		controller.undo();

		expect(controller.getSnapshot()?.data.workExperience.map((job) => job.position)).toEqual([
			'First',
			'Second',
		]);
	});

	it('clamps an out-of-range index to the end of the collection', () => {
		const controller = new LocalResumeController({
			resume: createResume(),
		});

		controller.insertCollectionItem(ResumeCollections.WORK_EXPERIENCE, 99);

		expect(controller.getSnapshot()?.data.workExperience.map((job) => job.position)).toEqual([
			'First',
			'Second',
			'New Role',
		]);
	});
});
