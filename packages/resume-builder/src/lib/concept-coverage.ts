import type { Bullet, Resume } from '@resume-builder/entities';

import type { JobRequirement } from '@/graphql/types.ts';

type RequirementRelation = JobRequirement['concepts'][number]['relation'];

const relationPriority: Record<RequirementRelation, number> = {
	requires: 0,
	expects: 1,
	prefers: 2,
};

export interface RequirementConceptCoverage {
	concept: JobRequirement['concepts'][number]['concept'];
	relation: RequirementRelation;
	requirements: Array<Pick<JobRequirement, 'id' | 'what'>>;
	covered: boolean;
}

export interface ConceptCoverageSummary {
	concepts: RequirementConceptCoverage[];
	coveredCount: number;
	totalCount: number;
}

function resumeBulletIds(data: Resume['data']): Set<string> {
	return new Set(
		[
			...data.workExperience.flatMap(
				({ responsibilities }) => responsibilities,
			),
			...data.projects.flatMap(({ items }) => items),
			...(data.volunteering ?? []).flatMap(
				({ responsibilities }) => responsibilities,
			),
		].flatMap(({ bulletId }) => (bulletId ? [bulletId] : [])),
	);
}

export function deriveConceptCoverage(
	requirements: JobRequirement[],
	bullets: Bullet[],
	resume: Resume['data'],
): ConceptCoverageSummary {
	const selectedBulletIds = resumeBulletIds(resume);
	const coveredConceptIds = new Set(
		bullets
			.filter(({ id }) => selectedBulletIds.has(id))
			.flatMap(({ concepts }) =>
				concepts.map(({ conceptId }) => conceptId),
			),
	);
	const conceptsById = new Map<string, RequirementConceptCoverage>();

	for (const requirement of requirements) {
		for (const assertion of requirement.concepts) {
			const existing = conceptsById.get(assertion.conceptId);
			if (existing) {
				if (
					relationPriority[assertion.relation] <
					relationPriority[existing.relation]
				) {
					existing.relation = assertion.relation;
				}
				if (
					!existing.requirements.some(
						({ id }) => id === requirement.id,
					)
				) {
					existing.requirements.push({
						id: requirement.id,
						what: requirement.what,
					});
				}
				continue;
			}

			conceptsById.set(assertion.conceptId, {
				concept: assertion.concept,
				relation: assertion.relation,
				requirements: [{ id: requirement.id, what: requirement.what }],
				covered: coveredConceptIds.has(assertion.conceptId),
			});
		}
	}

	const concepts = [...conceptsById.values()].sort(
		(left, right) =>
			Number(left.covered) - Number(right.covered) ||
			relationPriority[left.relation] -
				relationPriority[right.relation] ||
			left.concept.label.localeCompare(right.concept.label),
	);
	const coveredCount = concepts.filter(({ covered }) => covered).length;

	return { concepts, coveredCount, totalCount: concepts.length };
}
