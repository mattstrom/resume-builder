import { Injectable } from '@nestjs/common';
import {
	REQUIREMENT_RELATION_WEIGHTS,
	requirementRelationSchema,
	type BulletStatus,
	type EvidenceSelectionCandidate,
	type EvidenceSelectionRequirement,
	type EvidenceSelectionResult,
	type EvidenceSourceType,
} from '@resume-builder/entities';

import { ConceptsService } from '../concepts/concepts.service.js';
import { BulletsService } from '../entities/bullets/bullets.service.js';
import { JobRequirementsService } from '../job-requirements/job-requirements.service.js';
import { selectEvidence } from './evidence-selection.js';

/** Roughly the number of bullets a one-page resume holds. */
export const DEFAULT_EVIDENCE_BUDGET = 18;

type RequirementFacts = Awaited<ReturnType<JobRequirementsService['findByApplication']>>;
type Bullets = Awaited<ReturnType<BulletsService['findAll']>>;

@Injectable()
export class EvidenceSelectionService {
	constructor(
		private readonly jobRequirements: JobRequirementsService,
		private readonly bullets: BulletsService,
		private readonly concepts: ConceptsService,
	) {}

	/**
	 * Plans which bullets to put on a resume for one application, and reports
	 * what the plan leaves uncovered.
	 */
	async planForApplication(
		uid: string,
		applicationId: string,
		budget: number = DEFAULT_EVIDENCE_BUDGET,
		status?: BulletStatus,
	): Promise<EvidenceSelectionResult> {
		const [requirementFacts, bullets] = await Promise.all([
			this.jobRequirements.findByApplication(uid, applicationId),
			// No status filter still excludes archived, leaving draft and ready.
			this.bullets.findAll(uid, status ? { status } : {}),
		]);

		const requirements = toRequirements(requirementFacts);
		if (requirements.length === 0 || bullets.length === 0) {
			return selectEvidence({ requirements, candidates: [], budget });
		}

		const requirementConceptIds = new Set(requirements.map(({ conceptId }) => conceptId));
		const namedConceptIds = [
			...new Set(
				bullets.flatMap(({ concepts }) => concepts.map(({ conceptId }) => conceptId)),
			),
		];
		const ancestors = await this.concepts.findBroaderClosure(namedConceptIds);

		return selectEvidence({
			requirements,
			candidates: toCandidates(bullets, requirementConceptIds, ancestors),
			budget,
		});
	}
}

/**
 * Collapses the application's requirement facts onto their concepts, keeping
 * the strongest predicate when several requirements name the same concept.
 */
function toRequirements(requirementFacts: RequirementFacts): EvidenceSelectionRequirement[] {
	const byConcept = new Map<string, EvidenceSelectionRequirement>();

	for (const fact of requirementFacts) {
		for (const edge of fact.concepts) {
			// `relation` is a free string in Postgres; anything outside the
			// job-side predicates is not a requirement and is skipped.
			const relation = requirementRelationSchema.safeParse(edge.relation);
			if (!relation.success) {
				continue;
			}

			const existing = byConcept.get(edge.conceptId);
			if (!existing) {
				byConcept.set(edge.conceptId, {
					conceptId: edge.conceptId,
					label: edge.concept.label,
					relation: relation.data,
					requirementIds: [fact.id],
				});
				continue;
			}

			if (!existing.requirementIds.includes(fact.id)) {
				existing.requirementIds.push(fact.id);
			}
			if (
				REQUIREMENT_RELATION_WEIGHTS[relation.data] >
				REQUIREMENT_RELATION_WEIGHTS[existing.relation]
			) {
				existing.relation = relation.data;
			}
		}
	}

	return [...byConcept.values()];
}

function toCandidates(
	bullets: Bullets,
	requirementConceptIds: Set<string>,
	ancestors: Map<string, Set<string>>,
): EvidenceSelectionCandidate[] {
	return bullets.map((bullet) => {
		const named = bullet.concepts.map(({ conceptId }) => conceptId);
		const broader = new Set<string>();
		for (const conceptId of named) {
			for (const ancestor of ancestors.get(conceptId) ?? []) {
				if (requirementConceptIds.has(ancestor)) {
					broader.add(ancestor);
				}
			}
		}

		return {
			id: bullet.id,
			text: bullet.text,
			sourceType: bullet.sourceType as EvidenceSourceType,
			sourceId: bullet.sourceId,
			directConceptIds: named.filter((conceptId) => requirementConceptIds.has(conceptId)),
			broaderConceptIds: [...broader],
			quality: meanRubricScore(bullet),
		};
	});
}

/**
 * Mean of whichever rubric dimensions have been scored.
 *
 * Used only as a tie-break, never in the objective, so the absolute scale of
 * these columns does not matter — only their order relative to each other.
 */
function meanRubricScore(bullet: Bullets[number]): number | undefined {
	const scores = [
		bullet.contextScore,
		bullet.actionScore,
		bullet.outcomeScore,
		bullet.clarityScore,
	].filter((score): score is number => typeof score === 'number');

	if (scores.length === 0) {
		return undefined;
	}

	return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}
