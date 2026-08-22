import type {
	EvidenceSelectionCandidate,
	EvidenceSelectionRequirement,
	RequirementRelation,
} from '@resume-builder/entities';

import { selectEvidence } from './evidence-selection.js';

function requirement(
	conceptId: string,
	relation: RequirementRelation = 'requires',
): EvidenceSelectionRequirement {
	return {
		conceptId,
		label: conceptId,
		relation,
		requirementIds: [`req-${conceptId}`],
	};
}

function candidate(
	id: string,
	directConceptIds: string[],
	broaderConceptIds: string[] = [],
	quality?: number,
): EvidenceSelectionCandidate {
	return {
		id,
		text: `bullet ${id}`,
		sourceType: 'job',
		sourceId: 'job-1',
		directConceptIds,
		broaderConceptIds,
		quality,
	};
}

describe('selectEvidence', () => {
	it('scores an ancestor match at half the weight of naming the concept', () => {
		const result = selectEvidence({
			requirements: [requirement('kubernetes'), requirement('cloud')],
			candidates: [
				candidate('a', ['kubernetes']),
				candidate('b', [], ['cloud']),
			],
			budget: 2,
		});

		expect(result.selected.map(({ id, marginalGain }) => [id, marginalGain])).toEqual([
			['a', 1],
			['b', 0.5],
		]);
		expect(result.coverage.achieved).toBe(1.5);
	});

	it('prefers a direct match over an ancestor match for the same concept', () => {
		const result = selectEvidence({
			requirements: [requirement('kubernetes')],
			candidates: [candidate('a', ['kubernetes'], ['kubernetes'])],
			budget: 1,
		});

		expect(result.selected[0]?.marginalGain).toBe(1);
	});

	it('does not spend budget on a bullet whose concepts are already covered', () => {
		const result = selectEvidence({
			requirements: [requirement('kubernetes'), requirement('go')],
			candidates: [
				candidate('a', ['kubernetes', 'go']),
				candidate('b', ['kubernetes', 'go']),
			],
			budget: 2,
		});

		expect(result.selected.map(({ id }) => id)).toEqual(['a']);
		expect(result.budget).toEqual({ requested: 2, used: 1 });
		expect(result.coverage.ratio).toBe(1);
	});

	it('separates requirements with no evidence from those that lost the budget', () => {
		const result = selectEvidence({
			requirements: [
				requirement('kubernetes'),
				requirement('terraform'),
				requirement('rust'),
			],
			candidates: [
				candidate('a', ['kubernetes']),
				candidate('b', ['terraform']),
			],
			budget: 1,
		});

		expect(result.selected.map(({ id }) => id)).toEqual(['a']);
		expect(result.gaps.unevidenced.map(({ conceptId }) => conceptId)).toEqual([
			'rust',
		]);
		expect(result.gaps.crowdedOut).toEqual([
			{
				conceptId: 'terraform',
				label: 'terraform',
				relation: 'requires',
				weight: 1,
				requirementIds: ['req-terraform'],
				availableEvidenceIds: ['b'],
			},
		]);
	});

	it('weights a required concept above a preferred one', () => {
		const result = selectEvidence({
			requirements: [
				requirement('accessibility', 'prefers'),
				requirement('kubernetes', 'requires'),
			],
			// 'a' sorts first, so only the weighting can put 'z' ahead of it.
			candidates: [
				candidate('a', ['accessibility']),
				candidate('z', ['kubernetes']),
			],
			budget: 1,
		});

		expect(result.selected.map(({ id }) => id)).toEqual(['z']);
	});

	it('collapses a repeated concept to its strongest predicate', () => {
		const result = selectEvidence({
			requirements: [
				requirement('kubernetes', 'prefers'),
				requirement('kubernetes', 'requires'),
			],
			candidates: [candidate('a', ['kubernetes'])],
			budget: 1,
		});

		expect(result.selected[0]?.marginalGain).toBe(1);
		expect(result.coverage.possible).toBe(1);
	});

	it('breaks equal marginal gains by writing quality, then by id', () => {
		const result = selectEvidence({
			requirements: [requirement('kubernetes'), requirement('go')],
			candidates: [
				candidate('a', ['kubernetes'], [], 2),
				candidate('b', ['kubernetes'], [], 4.5),
				candidate('c', ['go']),
			],
			budget: 2,
		});

		// 'b' outscores 'a' on quality; 'c' is the only route to 'go'.
		expect(result.selected.map(({ id }) => id)).toEqual(['b', 'c']);
	});

	it('is independent of the order candidates arrive in', () => {
		const requirements = [
			requirement('kubernetes'),
			requirement('go'),
			requirement('terraform', 'prefers'),
		];
		const candidates = [
			candidate('a', ['kubernetes']),
			candidate('b', ['go', 'terraform']),
			candidate('c', ['terraform']),
			candidate('d', [], ['kubernetes']),
		];

		const forward = selectEvidence({ requirements, candidates, budget: 2 });
		const reversed = selectEvidence({
			requirements: [...requirements].reverse(),
			candidates: [...candidates].reverse(),
			budget: 2,
		});

		expect(reversed).toEqual(forward);
	});

	/**
	 * The textbook instance where greedy leaves value on the table.
	 *
	 * A = {1,2,3,4}, B = {1,2,5}, C = {3,4,6}, budget 2.
	 * Greedy takes A first because it is biggest, then can only add one new
	 * element. The optimum is B + C, which covers all six.
	 *
	 * This asserts what greedy actually does rather than pretending it is
	 * optimal, so nobody later "fixes" it into something slower and no better.
	 */
	it('is not optimal, but stays inside the (1 - 1/e) bound', () => {
		const result = selectEvidence({
			requirements: [1, 2, 3, 4, 5, 6].map((n) => requirement(`c${n}`)),
			candidates: [
				candidate('a', ['c1', 'c2', 'c3', 'c4']),
				candidate('b', ['c1', 'c2', 'c5']),
				candidate('c', ['c3', 'c4', 'c6']),
			],
			budget: 2,
		});

		const optimum = 6;
		expect(result.selected.map(({ id }) => id)).toEqual(['a', 'b']);
		expect(result.coverage.achieved).toBe(5);
		expect(result.coverage.possible).toBe(optimum);
		expect(result.coverage.achieved).toBeLessThan(optimum);
		expect(result.coverage.achieved / optimum).toBeGreaterThanOrEqual(
			1 - 1 / Math.E,
		);
	});

	describe('degenerate input', () => {
		it('returns an empty plan when there are no requirements', () => {
			const result = selectEvidence({
				requirements: [],
				candidates: [candidate('a', ['kubernetes'])],
				budget: 5,
			});

			expect(result.selected).toEqual([]);
			expect(result.gaps).toEqual({ unevidenced: [], crowdedOut: [] });
			expect(result.coverage).toEqual({
				achieved: 0,
				possible: 0,
				ratio: 0,
			});
		});

		it('reports every requirement as unevidenced when there are no candidates', () => {
			const result = selectEvidence({
				requirements: [requirement('kubernetes')],
				candidates: [],
				budget: 5,
			});

			expect(result.gaps.unevidenced.map(({ conceptId }) => conceptId)).toEqual(
				['kubernetes'],
			);
			expect(result.gaps.crowdedOut).toEqual([]);
			expect(result.budget.used).toBe(0);
		});

		it('ignores candidates that name no requirement concept', () => {
			const result = selectEvidence({
				requirements: [requirement('kubernetes')],
				candidates: [candidate('a', []), candidate('b', ['unrelated'])],
				budget: 5,
			});

			expect(result.selected).toEqual([]);
			expect(result.gaps.unevidenced.map(({ conceptId }) => conceptId)).toEqual(
				['kubernetes'],
			);
		});

		it('stops at full coverage when the budget exceeds the candidate count', () => {
			const result = selectEvidence({
				requirements: [requirement('kubernetes')],
				candidates: [candidate('a', ['kubernetes'])],
				budget: 50,
			});

			expect(result.budget).toEqual({ requested: 50, used: 1 });
			expect(result.coverage.ratio).toBe(1);
		});
	});
});
