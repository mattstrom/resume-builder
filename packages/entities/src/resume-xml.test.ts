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
});
