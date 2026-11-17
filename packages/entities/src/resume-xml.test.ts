import { describe, expect, it } from 'vitest';

import type { Resume } from './models/resume.js';
import {
	RESUME_XML_NAMESPACE,
	resumeContentFromXml,
	resumeToXml,
	validateResumeXml,
} from './resume-xml.js';

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
		name: 'Alex & Morgan',
		title: 'Staff Engineer',
		summary: 'Builds <reliable> systems',
		contactInformation: {
			_id: 'contact-1',
			location: 'Portland',
			phoneNumber: '555-0100',
			email: 'alex@example.com',
			linkedInProfile: '',
			githubProfile: 'https://github.com/alex',
			personalWebsite: '',
		},
		workExperience: [
			{
				_id: 'job-1',
				sourceId: 'profile-job-1',
				uid: 'user-1',
				company: 'Acme',
				position: 'Engineer',
				location: 'Remote',
				startDate: '2020',
				responsibilities: [
					{
						_id: 'responsibility-1',
						text: 'Improved latency by 30%',
						bulletId: 'bullet-1',
					},
				],
			},
		],
		education: [],
		skills: [],
		skillGroups: [],
		projects: [
			{
				_id: 'project-1',
				sourceId: 'profile-project-1',
				uid: 'user-1',
				name: 'Compiler',
				description: '',
				technologies: ['TypeScript'],
				items: [
					{
						_id: 'item-1',
						text: 'Reduced build time by 40%',
						bulletId: 'bullet-2',
					},
				],
			},
		],
		volunteering: [
			{
				_id: 'volunteering-1',
				sourceId: 'profile-volunteering-1',
				uid: 'user-1',
				organization: 'Code Club',
				position: 'Mentor',
				startDate: '2021',
				responsibilities: [
					{
						_id: 'volunteering-responsibility-1',
						text: 'Mentored 12 students',
						bulletId: 'bullet-3',
					},
				],
			},
		],
	},
	createdAt: new Date(),
	updatedAt: new Date(),
} as Resume;

describe('resume XML', () => {
	it('round trips the current typed projection', () => {
		const xml = resumeToXml(resume);
		const projected = resumeContentFromXml(xml, resume.uid);

		expect(xml).toContain(`xmlns="${RESUME_XML_NAMESPACE}"`);
		expect(validateResumeXml(xml)).toEqual({ valid: true, errors: [] });
		expect(projected.name).toBe(resume.data.name);
		expect(projected.summary).toBe(resume.data.summary);
		expect(projected.workExperience[0]?.responsibilities).toEqual([
			{
				_id: 'responsibility-1',
				text: 'Improved latency by 30%',
				bulletId: 'bullet-1',
			},
		]);
		expect(xml).toContain('bullet-id="bullet-1"');
		expect(xml).toContain('source-id="profile-job-1"');
		expect(projected.projects[0]?.items[0]).toEqual({
			_id: 'item-1',
			text: 'Reduced build time by 40%',
			bulletId: 'bullet-2',
		});
		expect(projected.volunteering?.[0]?.responsibilities[0]).toEqual({
			_id: 'volunteering-responsibility-1',
			text: 'Mentored 12 students',
			bulletId: 'bullet-3',
		});
	});

	it('rejects entity declarations', () => {
		const result = validateResumeXml(
			'<!DOCTYPE resume [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><resume/>',
		);
		expect(result.valid).toBe(false);
	});

	it('projects legacy text-only bullets as unlinked structured bullets', () => {
		const legacyXml = resumeToXml(resume).replace(' bullet-id="bullet-1"', '');
		const projected = resumeContentFromXml(legacyXml, resume.uid);

		expect(projected.workExperience[0]?.responsibilities[0]).toEqual({
			_id: 'responsibility-1',
			text: 'Improved latency by 30%',
			bulletId: undefined,
		});
	});

	it('round trips selected experience entries and their bullets', () => {
		// Arrange
		const withSelectedExperience = {
			...resume,
			data: {
				...resume.data,
				selectedExperience: [
					{
						_id: 'selected-1',
						title: 'Platform Reliability',
						items: [
							{ _id: 'selected-item-1', text: 'Cut incidents by half', bulletId: 'bullet-4' },
							{ _id: 'selected-item-2', text: 'Led the on-call redesign' },
						],
					},
				],
			},
		} as Resume;

		// Act
		const xml = resumeToXml(withSelectedExperience);
		const projected = resumeContentFromXml(xml, resume.uid);
		const reprojected = resumeContentFromXml(
			resumeToXml({ ...withSelectedExperience, data: projected }),
			resume.uid,
		);

		// Assert
		expect(validateResumeXml(xml)).toEqual({ valid: true, errors: [] });
		expect(projected.selectedExperience).toEqual([
			{
				_id: 'selected-1',
				title: 'Platform Reliability',
				items: [
					{ _id: 'selected-item-1', text: 'Cut incidents by half', bulletId: 'bullet-4' },
					{ _id: 'selected-item-2', text: 'Led the on-call redesign', bulletId: undefined },
				],
			},
		]);
		expect(reprojected.selectedExperience).toEqual(projected.selectedExperience);
	});

	it('emits sections in the default order and marks the document as ordered', () => {
		// Arrange
		const expected = [
			'summary',
			'selected-experience',
			'work-experience',
			'education',
			'skills',
			'projects',
			'volunteer-experiences',
		];

		// Act
		const xml = resumeToXml(resume);
		const projected = resumeContentFromXml(xml, resume.uid);

		// Assert
		expect(xml).toContain('section-order="document"');
		expect(xml).toMatch(/<\/summary><selected-experience [^>]*><\/selected-experience><work-experience /);
		expect(projected.selectedExperience).toEqual([]);
		expect(projected.sectionOrder).toEqual(expected);
	});

	it('round trips a custom section order through document order', () => {
		// Arrange
		const sectionOrder = [
			'skills',
			'summary',
			'projects',
			'work-experience',
			'selected-experience',
			'volunteer-experiences',
			'education',
		];
		const reordered = { ...resume, data: { ...resume.data, sectionOrder } } as Resume;

		// Act
		const xml = resumeToXml(reordered);
		const projected = resumeContentFromXml(xml, resume.uid);

		// Assert
		expect(xml).toMatch(/<\/headline><skills /);
		expect(xml).toMatch(/<\/volunteer-experiences><education /);
		expect(projected.sectionOrder).toEqual(sectionOrder);
	});

	it('reads the order an agent produces by moving a section element', () => {
		// Arrange
		const xml = resumeToXml(resume);
		const projects = xml.match(/<projects .*<\/projects>/)![0];
		const moved = xml.replace(projects, '').replace('<summary ', `${projects}<summary `);

		// Act
		const projected = resumeContentFromXml(moved, resume.uid);

		// Assert
		expect(projected.sectionOrder?.slice(0, 2)).toEqual(['projects', 'summary']);
	});

	it('places sections missing from a partial order after their default predecessor', () => {
		// Arrange
		const partial = {
			...resume,
			data: { ...resume.data, sectionOrder: ['projects', 'summary', 'bogus', 'summary'] },
		} as unknown as Resume;

		// Act
		const projected = resumeContentFromXml(resumeToXml(partial), resume.uid);

		// Assert
		expect(projected.sectionOrder).toEqual([
			'projects',
			'volunteer-experiences',
			'summary',
			'selected-experience',
			'work-experience',
			'education',
			'skills',
		]);
	});

	it('ignores the serializer order of legacy documents', () => {
		// Arrange
		const legacyXml = [
			'<resume xmlns="https://mattstrom.com/schemas/resume" schema-version="1" xml:id="n_r">',
			'<contact-info xml:id="a"><name xml:id="b">Alex</name></contact-info>',
			'<headline xml:id="c">Engineer</headline>',
			'<summary xml:id="d">Summary</summary>',
			'<education xml:id="e"></education>',
			'<work-experience xml:id="f"></work-experience>',
			'<skills xml:id="g"></skills>',
			'<projects xml:id="h"></projects>',
			'<volunteer-experiences xml:id="i"></volunteer-experiences>',
			'</resume>',
		].join('');

		// Act
		const projected = resumeContentFromXml(legacyXml, resume.uid);

		// Assert
		expect(validateResumeXml(legacyXml)).toEqual({ valid: true, errors: [] });
		expect(projected.selectedExperience).toEqual([]);
		expect(projected.sectionOrder).toEqual([
			'summary',
			'selected-experience',
			'work-experience',
			'education',
			'skills',
			'projects',
			'volunteer-experiences',
		]);
	});

	it('keeps a legacy selected experience element after the section it follows', () => {
		// Arrange
		const legacyXml = [
			'<resume xmlns="https://mattstrom.com/schemas/resume" schema-version="1" xml:id="n_r">',
			'<contact-info xml:id="a"><name xml:id="b">Alex</name></contact-info>',
			'<headline xml:id="c">Engineer</headline>',
			'<summary xml:id="d">Summary</summary>',
			'<education xml:id="e"></education>',
			'<work-experience xml:id="f"></work-experience>',
			'<selected-experience xml:id="j"></selected-experience>',
			'<skills xml:id="g"></skills>',
			'<projects xml:id="h"></projects>',
			'<volunteer-experiences xml:id="i"></volunteer-experiences>',
			'</resume>',
		].join('');

		// Act
		const projected = resumeContentFromXml(legacyXml, resume.uid);

		// Assert
		expect(projected.sectionOrder).toEqual([
			'summary',
			'work-experience',
			'selected-experience',
			'education',
			'skills',
			'projects',
			'volunteer-experiences',
		]);
	});

	it('keeps every xml:id stable across repeated round trips', () => {
		// Arrange
		const firstXml = resumeToXml(resume);
		const firstProjection = resumeContentFromXml(firstXml, resume.uid);

		// Act
		const secondXml = resumeToXml({ ...resume, data: firstProjection });
		const secondProjection = resumeContentFromXml(secondXml, resume.uid);

		// Assert
		expect(secondXml).toBe(firstXml);
		expect(secondProjection.workExperience[0]?._id).toBe('n_job-1');
		expect(secondProjection.projects[0]?._id).toBe('n_project-1');
		expect(secondProjection.volunteering?.[0]?._id).toBe('n_volunteering-1');
	});
});
