import {
	COVERAGE_STRENGTH,
	REQUIREMENT_RELATION_WEIGHTS,
	type CrowdedOutGap,
	type EvidenceSelectionCandidate,
	type EvidenceSelectionInput,
	type EvidenceSelectionRequirement,
	type EvidenceSelectionResult,
	type RequirementGap,
	type RequirementRelation,
	type SelectedEvidence,
} from '@resume-builder/entities';

/**
 * Greedy budgeted maximum coverage over resume evidence.
 *
 * Pure: no Nest, no Prisma, no I/O. Everything this needs arrives in `input`,
 * which is what makes the guarantee below testable without a database.
 *
 * For a selected set S the objective is
 *
 *     cov(r, S) = max over b in S of strength(b, r)
 *     value(S)  = sum over r of weight(r) * cov(r, S)
 *
 * `max` is what makes this monotone submodular, which licenses greedy's
 * (1 - 1/e) bound and gives redundancy pruning for free: a second bullet
 * covering an already-covered concept earns almost no marginal gain.
 */

/** Guards against float dust in sums of 0.3 * 0.5 and friends. */
const EPSILON = 1e-9;

interface PreparedRequirement {
	conceptId: string;
	label: string;
	relation: RequirementRelation;
	weight: number;
	requirementIds: string[];
}

interface Move {
	id: string;
	gain: number;
	improves: string[];
}

export function selectEvidence(input: EvidenceSelectionInput): EvidenceSelectionResult {
	const requirements = prepareRequirements(input.requirements);
	const conceptIds = new Set(requirements.map(({ conceptId }) => conceptId));
	const weightOf = new Map(requirements.map(({ conceptId, weight }) => [conceptId, weight]));

	// Canonical order, so the result never depends on the caller's ordering.
	const candidates = [...input.candidates].sort((left, right) => left.id.localeCompare(right.id));
	const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
	const strengths = buildStrengths(candidates, conceptIds);

	const achievable = new Map<string, number>();
	const supporters = new Map<string, string[]>();

	for (const candidate of candidates) {
		for (const [conceptId, strength] of strengths.get(candidate.id) ?? []) {
			achievable.set(conceptId, Math.max(achievable.get(conceptId) ?? 0, strength));
			const existing = supporters.get(conceptId);
			if (existing) {
				existing.push(candidate.id);
			} else {
				supporters.set(conceptId, [candidate.id]);
			}
		}
	}

	const covered = new Map<string, number>();
	const remaining = new Set(candidates.map(({ id }) => id));
	const selected: SelectedEvidence[] = [];

	while (selected.length < input.budget && remaining.size > 0) {
		let best: Move | undefined;

		for (const id of remaining) {
			const move = evaluate(id, strengths, covered, weightOf);
			if (!move) {
				continue;
			}
			if (!best || isBetter(move, best, byId)) {
				best = move;
			}
		}

		// Every remaining candidate is fully redundant; stop short of budget
		// rather than padding the resume with bullets that add nothing.
		if (!best) {
			break;
		}

		const candidate = byId.get(best.id);
		if (!candidate) {
			break;
		}

		const strength = strengths.get(best.id) ?? new Map<string, number>();

		for (const conceptId of best.improves) {
			covered.set(conceptId, strength.get(conceptId) ?? 0);
		}

		remaining.delete(best.id);
		selected.push({
			id: candidate.id,
			text: candidate.text,
			sourceType: candidate.sourceType,
			sourceId: candidate.sourceId,
			marginalGain: round(best.gain),
			coversConceptIds: [...best.improves].sort((left, right) => left.localeCompare(right)),
		});
	}

	const unevidenced: RequirementGap[] = [];
	const crowdedOut: CrowdedOutGap[] = [];
	for (const requirement of requirements) {
		const reachable = achievable.get(requirement.conceptId) ?? 0;
		const got = covered.get(requirement.conceptId) ?? 0;
		const gap: RequirementGap = {
			conceptId: requirement.conceptId,
			label: requirement.label,
			relation: requirement.relation,
			weight: requirement.weight,
			requirementIds: requirement.requirementIds,
		};
		// Two gaps that demand opposite responses: nothing in the profile covers
		// this at all, versus evidence exists and lost the budget.
		if (reachable <= EPSILON) {
			unevidenced.push(gap);
		} else if (got <= EPSILON) {
			crowdedOut.push({
				...gap,
				availableEvidenceIds: supporters.get(requirement.conceptId) ?? [],
			});
		}
	}

	const achieved = requirements.reduce(
		(sum, { conceptId, weight }) => sum + weight * (covered.get(conceptId) ?? 0),
		0,
	);
	const possible = requirements.reduce(
		(sum, { conceptId, weight }) => sum + weight * (achievable.get(conceptId) ?? 0),
		0,
	);

	return {
		selected,
		gaps: {
			unevidenced: unevidenced.sort(compareGaps),
			crowdedOut: crowdedOut.sort(compareGaps),
		},
		coverage: {
			achieved: round(achieved),
			possible: round(possible),
			ratio: possible > EPSILON ? round(achieved / possible) : 0,
		},
		budget: { requested: input.budget, used: selected.length },
	};
}

/**
 * Collapses repeated concepts, keeping the strongest predicate. A job that both
 * requires and prefers the same concept requires it.
 */
function prepareRequirements(requirements: EvidenceSelectionRequirement[]): PreparedRequirement[] {
	const byConcept = new Map<string, PreparedRequirement>();
	for (const requirement of requirements) {
		const weight = REQUIREMENT_RELATION_WEIGHTS[requirement.relation];
		const existing = byConcept.get(requirement.conceptId);
		if (!existing) {
			byConcept.set(requirement.conceptId, {
				conceptId: requirement.conceptId,
				label: requirement.label,
				relation: requirement.relation,
				weight,
				requirementIds: [...requirement.requirementIds],
			});
			continue;
		}

		// Every requirement that named the concept stays attached, whichever
		// predicate wins, so a gap can be traced back to all of them.
		for (const id of requirement.requirementIds) {
			if (!existing.requirementIds.includes(id)) {
				existing.requirementIds.push(id);
			}
		}
		if (weight > existing.weight) {
			existing.relation = requirement.relation;
			existing.weight = weight;
			existing.label = requirement.label;
		}
	}

	return [...byConcept.values()];
}

/**
 * Coverage is read from the structural concept edges only.
 *
 * Deliberately not derived by inverting an evaluator's `evidenceItemIds`: that
 * field is capped at three per concept and holds a model's pick of the *best*
 * evidence, not the complete relation. Inverting it silently truncates coverage
 * and makes the selection wrong.
 */
function buildStrengths(
	candidates: EvidenceSelectionCandidate[],
	conceptIds: Set<string>,
): Map<string, Map<string, number>> {
	const strengths = new Map<string, Map<string, number>>();
	for (const candidate of candidates) {
		const strength = new Map<string, number>();
		for (const conceptId of candidate.broaderConceptIds) {
			if (conceptIds.has(conceptId)) {
				strength.set(conceptId, COVERAGE_STRENGTH.broader);
			}
		}
		// Direct naming overwrites an ancestor match for the same concept.
		for (const conceptId of candidate.directConceptIds) {
			if (conceptIds.has(conceptId)) {
				strength.set(conceptId, COVERAGE_STRENGTH.direct);
			}
		}
		strengths.set(candidate.id, strength);
	}

	return strengths;
}

function evaluate(
	id: string,
	strengths: Map<string, Map<string, number>>,
	covered: Map<string, number>,
	weightOf: Map<string, number>,
): Move | undefined {
	let gain = 0;
	const improves: string[] = [];
	for (const [conceptId, strength] of strengths.get(id) ?? []) {
		const delta = strength - (covered.get(conceptId) ?? 0);
		if (delta <= EPSILON) {
			continue;
		}
		gain += (weightOf.get(conceptId) ?? 0) * delta;
		improves.push(conceptId);
	}

	return gain > EPSILON ? { id, gain, improves } : undefined;
}

/**
 * Marginal gain decides. Writing quality only breaks ties, and `id` breaks
 * those, so the selection is fully deterministic.
 */
function isBetter(move: Move, best: Move, byId: Map<string, EvidenceSelectionCandidate>): boolean {
	if (move.gain - best.gain > EPSILON) {
		return true;
	}
	if (best.gain - move.gain > EPSILON) {
		return false;
	}
	const moveQuality = qualityOf(byId.get(move.id));
	const bestQuality = qualityOf(byId.get(best.id));
	if (moveQuality !== bestQuality) {
		return moveQuality > bestQuality;
	}

	return move.id.localeCompare(best.id) < 0;
}

/** Unscored bullets lose ties to scored ones rather than winning by accident. */
function qualityOf(candidate: EvidenceSelectionCandidate | undefined): number {
	const quality = candidate?.quality;

	return typeof quality === 'number' ? quality : Number.NEGATIVE_INFINITY;
}

function compareGaps(left: RequirementGap, right: RequirementGap): number {
	return (
		right.weight - left.weight ||
		left.label.localeCompare(right.label) ||
		left.conceptId.localeCompare(right.conceptId)
	);
}

function round(value: number): number {
	return Math.round(value * 1e6) / 1e6;
}
