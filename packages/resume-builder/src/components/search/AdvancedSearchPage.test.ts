import type { AgentSearchResult } from '@resume-builder/entities';
import { describe, expect, it, vi } from 'vitest';

import { agentResult } from '../../lib/agent-search-result.ts';

function result(
	locator: AgentSearchResult['locator'],
	type: AgentSearchResult['type'] = 'BULLET',
): AgentSearchResult {
	return {
		id: `${type}:result-1`,
		type,
		title: 'Result title',
		excerpt: 'Evidence excerpt',
		source: 'Profile evidence',
		locator,
		score: 0.91,
		reason: 'Direct evidence for the requested experience.',
		matchKinds: ['vector', 'expanded'],
	};
}

describe('agentResult', () => {
	it('maps agent score, explanation, and feedback state into a table row', () => {
		const onFeedback = vi.fn();
		const row = agentResult(
			result(
				{
					kind: 'bullet',
					bulletId: 'bullet-1',
					sourceType: 'job',
					sourceId: 'job-1',
				},
				'BULLET',
			),
			true,
			false,
			onFeedback,
		);

		expect(row).toMatchObject({
			type: 'Bullet',
			score: 0.91,
			agentReason: 'Direct evidence for the requested experience.',
			feedback: true,
			to: '/profile/work-history',
			search: { bulletId: 'bullet-1' },
		});
		row.onFeedback?.(false);
		expect(onFeedback).toHaveBeenCalledWith(false);
	});

	it('maps application resumes to the existing editor route', () => {
		const row = agentResult(
			result(
				{
					kind: 'resume',
					resumeId: 'resume-1',
					applicationId: 'application-1',
				},
				'SUMMARY',
			),
			undefined,
			false,
			vi.fn(),
		);

		expect(row).toMatchObject({
			type: 'Summary',
			to: '/editor/$applicationId',
			params: { applicationId: 'application-1' },
			search: { resumeId: 'resume-1' },
		});
	});

	it('maps profile evidence to its selected profile section', () => {
		const row = agentResult(
			result({ kind: 'profile', section: 'concepts' }, 'CONCEPT'),
			undefined,
			false,
			vi.fn(),
		);

		expect(row).toMatchObject({ type: 'Concept', to: '/profile/concepts' });
	});
});
