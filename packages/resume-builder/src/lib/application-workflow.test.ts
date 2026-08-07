import type { Application } from '@resume-builder/entities';
import { describe, expect, it } from 'vitest';

import { deriveApplicationWorkflow } from './application-workflow.ts';

function application(overrides: Partial<Application> = {}): Application {
	return {
		_id: 'application-1',
		uid: 'user-1',
		name: 'Engineer',
		company: 'Acme',
		jobPostingUrl: '',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides,
	} as Application;
}

describe('deriveApplicationWorkflow', () => {
	it('makes requirement identification the next step after a job description is saved', () => {
		const workflow = deriveApplicationWorkflow(
			application({ jobDescription: 'Build reliable distributed systems.' }),
		);

		expect(workflow.stages.find(({ id }) => id === 'requirements')?.status).toBe('ready');
	});

	it('marks requirements complete after assertions have been identified', () => {
		const workflow = deriveApplicationWorkflow(
			application({ jobDescription: 'Build reliable distributed systems.' }),
			true,
		);

		expect(workflow.hasRequirements).toBe(true);
		expect(workflow.stages.find(({ id }) => id === 'requirements')?.status).toBe('complete');
	});

	it('requires job description text even when a posting URL is present', () => {
		const workflow = deriveApplicationWorkflow(
			application({ jobPostingUrl: 'https://example.com/jobs/1' }),
		);

		expect(workflow.hasPosting).toBe(true);
		expect(workflow.hasJobDescription).toBe(false);
		expect(workflow.stages.find(({ id }) => id === 'requirements')?.status).toBe('blocked');
	});
});
