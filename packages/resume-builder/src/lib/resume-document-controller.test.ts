import type { Resume } from '@resume-builder/entities';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';

import { getProjectAnchorId } from '../components/sections/section-anchors.ts';
import { ResumeCollections } from '../graphql/resume-collections.ts';
import { reorderItems } from './reorder.ts';
import { applyXmlOpsToFragment, LocalResumeController } from './resume-document-controller.ts';

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

describe('applyXmlOpsToFragment', () => {
	it('edits and moves stable XML elements without replacing the fragment', () => {
		const document = new Y.Doc();
		const fragment = document.getXmlFragment('resume');
		const root = new Y.XmlElement('resume');
		root.setAttribute('xml:id', 'resume-1');
		const section = new Y.XmlElement('work-experience');
		section.setAttribute('xml:id', 'work');
		const first = new Y.XmlElement('job');
		first.setAttribute('xml:id', 'job-1');
		const second = new Y.XmlElement('job');
		second.setAttribute('xml:id', 'job-2');
		section.insert(0, [first, second]);
		root.insert(0, [section]);
		fragment.insert(0, [root]);

		applyXmlOpsToFragment(fragment, [
			{ op: 'setText', target: { xmlId: 'job-1' }, value: 'Updated' },
			{
				op: 'setAttribute',
				target: { xmlId: 'job-1' },
				name: 'title',
				value: 'Engineer',
			},
			{
				op: 'moveNode',
				target: { xmlId: 'job-1' },
				parent: { xmlId: 'work' },
				index: 1,
			},
		]);

		const jobs = section.toArray() as Y.XmlElement[];
		expect(jobs.map((job) => job.getAttribute('xml:id'))).toEqual(['job-2', 'job-1']);
		expect(jobs[1]?.getAttribute('title')).toBe('Engineer');
		expect(jobs[1]?.toString()).toContain('Updated');
	});

	it('inserts XML elements before a sibling or at the end of a container', () => {
		const document = new Y.Doc();
		const fragment = document.getXmlFragment('resume');
		const root = new Y.XmlElement('resume');
		root.setAttribute('xml:id', 'resume-1');
		const section = new Y.XmlElement('skills');
		section.setAttribute('xml:id', 'skills');
		const existing = new Y.XmlElement('skill');
		existing.setAttribute('xml:id', 'skill-2');
		section.insert(0, [existing]);
		root.insert(0, [section]);
		fragment.insert(0, [root]);

		applyXmlOpsToFragment(fragment, [
			{
				op: 'insertElement',
				target: { xmlId: 'skill-2' },
				position: 'before',
				xml: '<skill xml:id="skill-1"></skill>',
			},
			{
				op: 'insertElement',
				target: { xmlId: 'skills' },
				position: 'append',
				xml: '<skill-group xml:id="group-1"></skill-group>',
			},
		]);

		expect(
			(section.toArray() as Y.XmlElement[]).map((element) => element.getAttribute('xml:id')),
		).toEqual(['skill-1', 'skill-2', 'group-1']);
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

	it('detaches a bank bullet when its resume text is edited', () => {
		const controller = new LocalResumeController({ resume: createResume() });

		controller.setField('data.workExperience.0.responsibilities.0.text', 'Updated text');
		controller.moveArrayItem('data.workExperience.0.responsibilities', 0, 1);

		const bullets = controller.getSnapshot()?.data.workExperience[0]?.responsibilities;
		expect(bullets).toEqual([
			{ _id: 'bullet-local-2', text: 'Two' },
			{ _id: 'bullet-local-1', text: 'Updated text' },
		]);
		expect(controller.getXml()).toContain(
			'<responsibility xml:id="bullet-local-1">Updated text</responsibility>',
		);
	});

	it('preserves a bank reference when only bullet order changes', () => {
		const controller = new LocalResumeController({ resume: createResume() });

		controller.moveArrayItem('data.workExperience.0.responsibilities', 0, 1);

		expect(controller.getSnapshot()?.data.workExperience[0]?.responsibilities).toEqual([
			{ _id: 'bullet-local-2', text: 'Two' },
			{ _id: 'bullet-local-1', text: 'One', bulletId: 'bank-1' },
		]);
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
