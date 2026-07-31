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
				uid: 'user-1',
				company: 'Acme',
				position: 'Engineer',
				location: 'Remote',
				startDate: '2020',
				responsibilities: ['Improved latency by 30%'],
			},
		],
		education: [],
		skills: [],
		skillGroups: [],
		projects: [],
		volunteering: [],
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
		expect(projected.workExperience[0]?.responsibilities).toEqual(['Improved latency by 30%']);
	});

	it('rejects entity declarations', () => {
		const result = validateResumeXml(
			'<!DOCTYPE resume [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><resume/>',
		);
		expect(result.valid).toBe(false);
	});
});
