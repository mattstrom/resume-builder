import { describe, expect, it } from 'vitest';

import {
	agentSearchEvaluationCases,
	ndcgAt,
	passesAgentSearchReleaseGate,
	recallAt,
} from './agent-search.evaluation';

describe('agent search evaluation', () => {
	it('covers the required query categories', () => {
		expect(
			new Set(agentSearchEvaluationCases.map(({ category }) => category)),
		).toEqual(
			new Set([
				'ambiguous',
				'synonym',
				'multi-constraint',
				'exact',
				'no-result',
			]),
		);
	});

	it('scores recall and ranking quality at ten', () => {
		const relevance = { direct: 3, related: 1 };
		expect(recallAt(['direct'], relevance)).toBe(0.5);
		expect(
			ndcgAt(['direct', 'irrelevant', 'related'], relevance),
		).toBeGreaterThan(0.9);
	});

	it('requires better nDCG without lower recall', () => {
		const agent = Object.fromEntries(
			agentSearchEvaluationCases.map((item) => [
				item.id,
				Object.keys(item.relevance),
			]),
		);
		const vector = Object.fromEntries(
			agentSearchEvaluationCases.map((item) => [
				item.id,
				Object.keys(item.relevance).reverse(),
			]),
		);
		vector['ambiguous-platform-work'] = ['irrelevant'];

		expect(passesAgentSearchReleaseGate(agent, vector)).toBe(true);
	});
});
