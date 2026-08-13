import { z } from 'zod';

export const conceptEvidenceGradeSchema = z.enum(['strong', 'moderate', 'weak', 'missing']);

export const conceptEvidenceEvaluationInputSchema = z.object({
	concepts: z
		.array(
			z.object({
				id: z.string().trim().min(1),
				key: z.string().trim().min(1),
				label: z.string().trim().min(1),
				definition: z.string().trim().optional(),
				relation: z.enum(['requires', 'expects', 'prefers']),
				requirements: z.array(z.string().trim().min(1)).min(1),
			}),
		)
		.max(100),
	evidenceItems: z
		.array(
			z.object({
				id: z.string().trim().min(1),
				label: z.string().trim().min(1),
				sourceType: z.enum([
					'title',
					'summary',
					'skill',
					'experience',
					'project',
					'education',
					'fact',
					'volunteering',
					'bullet',
				]),
				text: z.string().trim().min(1).max(2000),
				/** Requirement concepts this item names directly. */
				conceptIds: z.array(z.string().trim().min(1)),
				/**
				 * Requirement concepts reached only by walking up the ontology —
				 * related, but a weaker claim than naming the concept outright.
				 */
				broaderConceptIds: z.array(z.string().trim().min(1)).default([]),
			}),
		)
		.max(200),
	profileGuidance: z.array(z.string().trim().min(1).max(500)).max(100).default([]),
});

export const conceptEvidenceItemSchema = z.object({
	conceptId: z.string().trim().min(1),
	grade: conceptEvidenceGradeSchema,
	score: z.number().min(0).max(1),
	evidenceItemIds: z.array(z.string().trim().min(1)).max(3),
	rationale: z.string().trim().min(1),
});

export const conceptEvidenceEvaluationSchema = z.object({
	evaluations: z.array(conceptEvidenceItemSchema),
	summary: z.string().trim().min(1),
});

export type ConceptEvidenceEvaluation = z.infer<typeof conceptEvidenceEvaluationSchema>;
