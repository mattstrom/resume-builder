import type { AgentSearchCandidate } from '@resume-builder/entities';
import { describe, expect, it } from 'vitest';

import {
	fallbackResults,
	mergeCandidates,
	normalizeQueries,
	rankedResults,
} from './agent-search.workflow';

const candidate = (id: string, baseScore: number): AgentSearchCandidate => ({
	id,
	type: 'BULLET',
	title: id,
	excerpt: `${id} evidence`,
	source: 'Profile bullets',
	locator: {
		kind: 'bullet',
		bulletId: id,
		sourceType: 'job',
		sourceId: 'job-1',
	},
	baseScore,
	matchKinds: ['vector'],
});

describe('agent search workflow helpers', () => {
	it('keeps the original query first, deduplicates, and caps expansions', () => {
		expect(
			normalizeQueries('Platform Reliability', [
				'platform reliability',
				'SRE',
				'incident response',
				'observability',
				'extra query',
			]),
		).toEqual([
			'Platform Reliability',
			'SRE',
			'incident response',
			'observability',
		]);
	});

	it('deduplicates candidates and preserves the strongest retrieval signal', () => {
		const lexical = {
			...candidate('bullet-1', 1),
			matchKinds: ['lexical' as const],
		};
		const vector = candidate('bullet-1', 0.8);

		expect(mergeCandidates([[vector], [lexical]])).toEqual([
			expect.objectContaining({
				id: 'bullet-1',
				baseScore: 1,
				matchKinds: ['vector', 'lexical'],
			}),
		]);
	});

	it('rejects invented IDs and applies deterministic ordering', () => {
		const results = rankedResults(
			[candidate('bullet-1', 0.8), candidate('bullet-2', 0.7)],
			[
				{ id: 'invented', score: 1, reason: 'Not real' },
				{ id: 'bullet-2', score: 0.95, reason: 'Direct evidence.' },
			],
			10,
		);

		expect(results.map(({ id }) => id)).toEqual(['bullet-2', 'bullet-1']);
		expect(results).not.toContainEqual(
			expect.objectContaining({ id: 'invented' }),
		);
	});

	it('falls back to retrieval scores and respects the result limit', () => {
		const results = fallbackResults(
			[candidate('bullet-1', 0.8), candidate('bullet-2', 0.7)],
			1,
		);

		expect(results).toEqual([
			expect.objectContaining({
				id: 'bullet-1',
				score: 0.8,
				reason: 'Ranked by hybrid lexical and vector retrieval.',
			}),
		]);
	});
});
