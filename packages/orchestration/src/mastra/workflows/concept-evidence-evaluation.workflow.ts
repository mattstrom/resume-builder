import { createStep, createWorkflow } from '@mastra/core/workflows';
import { outdent } from 'outdent';
import { z } from 'zod';

import { conceptEvidenceEvaluatorAgent } from '../agents/concept-evidence-evaluator.agent';
import {
	conceptEvidenceEvaluationInputSchema,
	conceptEvidenceEvaluationSchema,
	type ConceptEvidenceEvaluation,
} from '../schemas/concept-evidence-evaluation.schemas';

const rawEvaluationSchema = z.object({
	evaluations: z.array(
		z.object({
			conceptId: z.string().trim().min(1),
			score: z.number().min(0).max(1),
			evidenceItemIds: z.array(z.string().trim().min(1)).max(3),
			rationale: z.string().trim().min(1),
		}),
	),
	summary: z.string().trim().min(1),
});

function gradeForScore(score: number): ConceptEvidenceEvaluation['evaluations'][number]['grade'] {
	if (score >= 0.85) return 'strong';
	if (score >= 0.6) return 'moderate';
	if (score >= 0.25) return 'weak';
	return 'missing';
}

const evaluateConceptEvidenceStep = createStep({
	id: 'evaluate-concept-evidence',
	description: 'Grades the evidence for each job concept across the complete resume',
	inputSchema: conceptEvidenceEvaluationInputSchema,
	outputSchema: conceptEvidenceEvaluationSchema,
	execute: async ({ inputData }) => {
		if (inputData.concepts.length === 0) {
			return {
				evaluations: [],
				summary: 'There are no job concepts to evaluate yet.',
			};
		}

		const response = await conceptEvidenceEvaluatorAgent.generate(
			outdent`
				Job concepts:
				${JSON.stringify(inputData.concepts, null, 2)}

				Resume evidence items:
				${JSON.stringify(inputData.evidenceItems, null, 2)}
			`,
			{
				structuredOutput: { schema: rawEvaluationSchema },
				modelSettings: {
					temperature: 0,
					maxOutputTokens: 4000,
				},
			},
		);

		const validEvidenceItemIds = new Set(inputData.evidenceItems.map(({ id }) => id));
		const rawByConceptId = new Map(
			response.object.evaluations.map((evaluation) => [evaluation.conceptId, evaluation]),
		);
		const evaluations = inputData.concepts.map(({ id, label }) => {
			const raw = rawByConceptId.get(id);
			// Deliberately `conceptIds` and not `broaderConceptIds`: the floor
			// below asserts the author named this exact concept. A match reached
			// by walking up the ontology is real but weaker, so it reaches the
			// evaluator as context and earns whatever score the model gives it.
			const explicitEvidenceItemIds = inputData.evidenceItems
				.filter(
					(item) =>
						(item.sourceType === 'skill' || item.sourceType === 'project') &&
						item.conceptIds.includes(id),
				)
				.map(({ id: itemId }) => itemId)
				.slice(0, 3);
			if (!raw) {
				if (explicitEvidenceItemIds.length > 0) {
					return {
						conceptId: id,
						grade: 'moderate' as const,
						score: 0.6,
						evidenceItemIds: explicitEvidenceItemIds,
						rationale: `${label} is explicitly listed in the resume's skills or project technologies.`,
					};
				}
				return {
					conceptId: id,
					grade: 'missing' as const,
					score: 0,
					evidenceItemIds: [],
					rationale: 'No credible evidence was identified anywhere in the resume.',
				};
			}

			const score = Math.max(raw.score, explicitEvidenceItemIds.length > 0 ? 0.6 : 0);
			const grade = gradeForScore(score);
			return {
				conceptId: id,
				grade,
				score,
				evidenceItemIds:
					grade === 'missing'
						? []
						: [
								...new Set(
									[...raw.evidenceItemIds, ...explicitEvidenceItemIds].filter(
										(itemId) => validEvidenceItemIds.has(itemId),
									),
								),
							].slice(0, 3),
				rationale:
					raw.score < 0.6 && explicitEvidenceItemIds.length > 0
						? `${label} is explicitly listed in the resume's skills or project technologies.`
						: raw.rationale,
			};
		});
		const evidencedCount = evaluations.filter(
			({ grade }) => grade === 'strong' || grade === 'moderate',
		).length;
		const needsEvidenceCount = evaluations.length - evidencedCount;

		return conceptEvidenceEvaluationSchema.parse({
			evaluations,
			summary:
				needsEvidenceCount === 0
					? `All ${evaluations.length} concepts have moderate or strong resume evidence.`
					: `${evidencedCount} of ${evaluations.length} concepts have moderate or strong resume evidence; ${needsEvidenceCount} need stronger evidence.`,
		});
	},
});

export const conceptEvidenceEvaluationWorkflow = createWorkflow({
	id: 'concept-evidence-evaluation-workflow',
	description: 'Evaluates and grades how well the complete resume evidences job concepts',
	inputSchema: conceptEvidenceEvaluationInputSchema,
	outputSchema: conceptEvidenceEvaluationSchema,
})
	.then(evaluateConceptEvidenceStep)
	.commit();
