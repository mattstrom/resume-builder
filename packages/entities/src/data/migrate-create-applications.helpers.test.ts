import { describe, expect, it } from 'vitest';
import {
	buildApplicationBackfillInserts,
	getAttachedResumeKeys,
	getResumeAttachmentKey,
} from './migrate-create-applications.helpers.js';

describe('migrate-create-applications helpers', () => {
	it('creates inserts for resumes without attached applications', () => {
		const inserts = buildApplicationBackfillInserts(
			[
				{
					_id: 'resume-1',
					uid: 'user-1',
					name: 'Frontend Resume',
					company: 'Acme',
					jobPostingUrl: 'https://example.com/job',
				},
			],
			[],
		);

		expect(inserts).toEqual([
			{
				uid: 'user-1',
				resumeId: 'resume-1',
				name: 'Frontend Resume',
				company: 'Acme',
				jobPostingUrl: 'https://example.com/job',
			},
		]);
	});

	it('skips resumes already referenced by application resumeId', () => {
		const inserts = buildApplicationBackfillInserts(
			[
				{
					_id: 'resume-1',
					uid: 'user-1',
					name: 'Frontend Resume',
					company: 'Acme',
					jobPostingUrl: 'https://example.com/job',
				},
			],
			[{ uid: 'user-1', resumeId: 'resume-1' }],
		);

		expect(inserts).toEqual([]);
	});

	it('does not treat matching URL or company as attachment', () => {
		const inserts = buildApplicationBackfillInserts(
			[
				{
					_id: 'resume-1',
					uid: 'user-1',
					name: 'Frontend Resume',
					company: 'Acme',
					jobPostingUrl: 'https://example.com/job',
				},
			],
			[{ uid: 'user-1', resumeId: 'resume-2' }],
		);

		expect(inserts).toHaveLength(1);
		expect(inserts[0]?.resumeId).toBe('resume-1');
	});

	it('scopes attachment checks by user', () => {
		const inserts = buildApplicationBackfillInserts(
			[
				{
					_id: 'resume-1',
					uid: 'user-1',
					name: 'Frontend Resume',
					company: 'Acme',
					jobPostingUrl: 'https://example.com/job',
				},
				{
					_id: 'resume-1',
					uid: 'user-2',
					name: 'Platform Resume',
					company: 'Beta',
					jobPostingUrl: 'https://example.com/job-2',
				},
			],
			[{ uid: 'user-1', resumeId: 'resume-1' }],
		);

		expect(inserts).toEqual([
			{
				uid: 'user-2',
				resumeId: 'resume-1',
				name: 'Platform Resume',
				company: 'Beta',
				jobPostingUrl: 'https://example.com/job-2',
			},
		]);
	});

	it('defaults blank overlapping fields when missing', () => {
		const inserts = buildApplicationBackfillInserts(
			[
				{
					_id: 'resume-1',
					uid: 'user-1',
				},
			],
			[],
		);

		expect(inserts).toEqual([
			{
				uid: 'user-1',
				resumeId: 'resume-1',
				name: '',
				company: '',
				jobPostingUrl: '',
			},
		]);
	});

	it('builds attached resume keys from applications with resume ids only', () => {
		const keys = getAttachedResumeKeys([
			{ uid: 'user-1', resumeId: 'resume-1' },
			{ uid: 'user-2', resumeId: null },
		]);

		expect(keys).toEqual(new Set([getResumeAttachmentKey('user-1', 'resume-1')]));
	});
});
