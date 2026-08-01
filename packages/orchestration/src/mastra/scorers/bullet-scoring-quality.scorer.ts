import { createScorer } from '@mastra/core/evals';
import {
	getAssistantMessageFromRunOutput,
	getUserMessageFromRunInput,
	roundToTwoDecimals,
} from '@mastra/evals/scorers/utils';
import { outdent } from 'outdent';
import { z } from 'zod';

import config from '@/config';

const bulletScoringAnalysisSchema = z.object({
	rubricAlignment: z.number().min(0).max(1),
	grounding: z.number().min(0).max(1),
	calibration: z.number().min(0).max(1),
	noteQuality: z.number().min(0).max(1),
	explanation: z.string().trim().min(1),
});

export const bulletScoringQualityScorer = createScorer({
	id: 'bullet-scoring-quality',
	name: 'Bullet Scoring Quality',
	description:
		'Evaluates whether bullet scores are grounded, calibrated, and supported by useful notes',
	type: 'agent',
	judge: {
		model: config.llms.defaultModel,
		instructions: outdent`
			You are a strict evaluator of resume-bullet scoring. Judge only whether the
			scoring response correctly evaluates the supplied bullet. Do not rewrite the
			bullet or reward invented context, metrics, outcomes, or ownership.

			Return only structured data matching the requested schema.
		`,
	},
})
	.preprocess(({ run }) => ({
		bulletText: getUserMessageFromRunInput(run.input) ?? '',
		scoreOutput: getAssistantMessageFromRunOutput(run.output) ?? '',
	}))
	.analyze({
		description: 'Judge the semantic quality of a bullet-scoring response',
		outputSchema: bulletScoringAnalysisSchema,
		createPrompt: ({ results }) => outdent`
			Evaluate the scoring response for this resume bullet.

			<bullet>
			${results.preprocessStepResult.bulletText}
			</bullet>

			<scoring_response>
			${results.preprocessStepResult.scoreOutput}
			</scoring_response>

			The scoring response should contain Context, Action, Outcome, and Clarity
			scores on a 0–1 scale plus a concise note for each dimension. Use these
			anchors: 1.00 strong, 0.75 good with a minor gap, 0.50 mixed with a
			meaningful gap, 0.25 weak or merely hinted, and 0.00 absent.

			Evaluate four qualities from 0 to 1:
			- rubricAlignment: Each dimension is judged by its actual definition.
			  Context covers problem, purpose, constraint, or scope. Action covers the
			  person's concrete contribution and ownership. Outcome covers what changed,
			  shipped, improved, or became possible. Clarity covers specificity,
			  grammar, concision, logical order, truthful language, and a preferred length
			  of roughly 80–400 characters.
			- grounding: Scores and notes rely only on evidence in the bullet, without
			  invented metrics, facts, impact, or ownership.
			- calibration: Scores consistently use the anchors and are neither overly
			  generous nor overly harsh. Observable outcomes are valid without metrics.
			- noteQuality: Notes identify concrete evidence and the most important gap,
			  if any, in one concise sentence per dimension.

			If the scoring response is missing, malformed, or does not contain all four
			dimensions, score all affected qualities at 0. Explain the most important
			strength or failure concisely.
		`,
	})
	.generateScore(({ results }) => {
		const analysis = results.analyzeStepResult;
		return roundToTwoDecimals(
			analysis.rubricAlignment * 0.35 +
				analysis.grounding * 0.3 +
				analysis.calibration * 0.2 +
				analysis.noteQuality * 0.15,
		);
	})
	.generateReason(({ results, score }) => {
		const analysis = results.analyzeStepResult;
		return outdent`
			Bullet scoring quality: ${score}. Rubric alignment=${analysis.rubricAlignment},
			grounding=${analysis.grounding}, calibration=${analysis.calibration}, and
			note quality=${analysis.noteQuality}. ${analysis.explanation}
		`;
	});
