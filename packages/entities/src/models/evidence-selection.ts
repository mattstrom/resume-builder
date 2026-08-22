import { z } from 'zod';

/**
 * Selecting resume evidence against a job description is budgeted maximum
 * coverage: pick the subset of bullets that maximizes weighted requirement
 * coverage subject to a budget.
 *
 * The problem is NP-hard in general, but the objective below is monotone
 * submodular, so greedy selection is within (1 - 1/e) of optimal
 * (Nemhauser-Wolsey-Fisher 1978) and no polynomial algorithm does better
 * (Feige 1998). At one person's career scale greedy is also instant.
 */

export const requirementRelationSchema = z.enum([
	'requires',
	'expects',
	'prefers',
]);

export const evidenceSourceTypeSchema = z.enum([
	'job',
	'project',
	'volunteering',
]);

export type RequirementRelation = z.infer<typeof requirementRelationSchema>;

/**
 * How much each job-side predicate contributes to the objective. Mirrors the
 * ordering already used by `relationPriority` in the web package.
 */
export const REQUIREMENT_RELATION_WEIGHTS: Record<RequirementRelation, number> =
	{
		requires: 1,
		expects: 0.6,
		prefers: 0.3,
	};

/**
 * A bullet that names a requirement concept outright is stronger evidence than
 * one reached by walking up the ontology. Naming `AWS` covers a requirement for
 * `Cloud Platforms` weakly; the reverse does not cover at all.
 */
export const COVERAGE_STRENGTH = {
	direct: 1,
	broader: 0.5,
} as const;

export const evidenceSelectionRequirementSchema = z.object({
	conceptId: z.string().min(1),
	label: z.string(),
	relation: requirementRelationSchema,
	/** JobRequirementFact ids that gave rise to this concept. */
	requirementIds: z.array(z.string()).default([]),
});

export const evidenceSelectionCandidateSchema = z.object({
	id: z.string().min(1),
	text: z.string(),
	sourceType: evidenceSourceTypeSchema,
	sourceId: z.string(),
	/** Requirement concepts this candidate names directly. */
	directConceptIds: z.array(z.string()).default([]),
	/**
	 * Requirement concepts that are ancestors of a concept this candidate names.
	 * Real coverage, but a weaker claim than naming the concept outright.
	 */
	broaderConceptIds: z.array(z.string()).default([]),
	/**
	 * Optional writing-quality signal used only to break ties between candidates
	 * with identical marginal gain. Never part of the objective.
	 */
	quality: z.number().nullable().optional(),
});

export const evidenceSelectionInputSchema = z.object({
	requirements: z.array(evidenceSelectionRequirementSchema),
	candidates: z.array(evidenceSelectionCandidateSchema),
	budget: z.number().int().min(1).max(100).default(18),
});

export const selectedEvidenceSchema = z.object({
	id: z.string(),
	text: z.string(),
	sourceType: evidenceSourceTypeSchema,
	sourceId: z.string(),
	/** How much this candidate added to the objective when it was chosen. */
	marginalGain: z.number(),
	/** Requirement concepts whose coverage this candidate actually improved. */
	coversConceptIds: z.array(z.string()),
});

export const requirementGapSchema = z.object({
	conceptId: z.string(),
	label: z.string(),
	relation: requirementRelationSchema,
	weight: z.number(),
	/** JobRequirementFact ids that asked for this concept. */
	requirementIds: z.array(z.string()),
});

export const crowdedOutGapSchema = requirementGapSchema.extend({
	/** Candidates that would have covered this concept but lost the budget. */
	availableEvidenceIds: z.array(z.string()).min(1),
});

export const evidenceSelectionResultSchema = z.object({
	selected: z.array(selectedEvidenceSchema),
	gaps: z.object({
		/** Nothing in the profile covers these. Write about them, or do not apply. */
		unevidenced: z.array(requirementGapSchema),
		/** Evidence exists but did not fit the budget. */
		crowdedOut: z.array(crowdedOutGapSchema),
	}),
	coverage: z.object({
		achieved: z.number(),
		possible: z.number(),
		ratio: z.number(),
	}),
	budget: z.object({
		requested: z.number().int(),
		used: z.number().int(),
	}),
});

export type EvidenceSourceType = z.infer<typeof evidenceSourceTypeSchema>;
export type EvidenceSelectionRequirement = z.infer<
	typeof evidenceSelectionRequirementSchema
>;
export type EvidenceSelectionCandidate = z.infer<
	typeof evidenceSelectionCandidateSchema
>;
export type EvidenceSelectionInput = z.infer<
	typeof evidenceSelectionInputSchema
>;
export type SelectedEvidence = z.infer<typeof selectedEvidenceSchema>;
export type RequirementGap = z.infer<typeof requirementGapSchema>;
export type CrowdedOutGap = z.infer<typeof crowdedOutGapSchema>;
export type EvidenceSelectionResult = z.infer<
	typeof evidenceSelectionResultSchema
>;
