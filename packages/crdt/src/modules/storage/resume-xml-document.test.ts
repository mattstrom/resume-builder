import { createResumeXmlId, resumeToXml, type Resume } from '@resume-builder/entities';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';

import {
	applyResumeXmlOps,
	getResumeContent,
	replaceResumeXml,
	serializeResumeXml,
} from './resume-xml-document.js';

const resume = {
	_id: 'resume-1',
	id: 'resume-1',
	uid: 'user-1',
	name: 'Base',
	company: '',
	level: '',
	jobPostingUrl: '',
	readOnly: false,
	base: true,
	data: {
		_id: 'content-1',
		name: 'Alex Morgan',
		title: 'Staff Engineer',
		summary: 'Builds reliable systems',
		contactInformation: {
			_id: 'contact-1',
			location: 'Portland',
			phoneNumber: '',
			email: 'alex@example.com',
			linkedInProfile: '',
			githubProfile: '',
			personalWebsite: '',
		},
		workExperience: [],
		education: [],
		skills: [],
		skillGroups: [],
		projects: [],
		volunteering: [],
	},
	createdAt: new Date(),
	updatedAt: new Date(),
} as Resume;

describe('resume XML Yjs document', () => {
	it('round trips canonical XML through a structural Y.XmlFragment', () => {
		const document = new Y.Doc();
		replaceResumeXml(document, resumeToXml(resume));
		const titleId = createResumeXmlId(resume._id, 'headline');

		expect(serializeResumeXml(document)).toContain(
			`<headline xml:id="${titleId}">Staff Engineer</headline>`,
		);
		expect(getResumeContent(document, resume.uid).title).toBe('Staff Engineer');
	});

	it('preserves foreign markup when setting core text', () => {
		const document = new Y.Doc();
		const xml = resumeToXml(resume)
			.replace(
				'Builds reliable systems',
				'Builds <lineage:source ref="job-1"></lineage:source> systems',
			)
			.replace(
				'xmlns="https://mattstrom.com/schemas/resume"',
				'xmlns="https://mattstrom.com/schemas/resume" xmlns:lineage="urn:resume:lineage"',
			);
		replaceResumeXml(document, xml);
		const summaryId = createResumeXmlId(resume._id, 'summary');

		applyResumeXmlOps(document, [
			{
				op: 'setText',
				target: { xmlId: summaryId },
				value: 'Builds resilient systems',
			},
		]);

		const updated = serializeResumeXml(document);
		expect(updated).toContain('Builds resilient systems');
		expect(updated).toContain('<lineage:source ref="job-1">');
	});

	it('rejects invalid operations without changing the live document', () => {
		const document = new Y.Doc();
		replaceResumeXml(document, resumeToXml(resume));
		const before = serializeResumeXml(document);
		const contactId = createResumeXmlId(resume._id, 'contact-info');

		expect(() =>
			applyResumeXmlOps(document, [
				{
					op: 'removeNode',
					target: { xmlId: contactId },
				},
			]),
		).toThrow('violate the resume schema');
		expect(serializeResumeXml(document)).toBe(before);
	});
});
