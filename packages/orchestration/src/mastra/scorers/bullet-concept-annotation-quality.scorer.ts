import { createScorer } from '@mastra/core/evals';
import {
	getAssistantMessageFromRunOutput,
	getUserMessageFromRunInput,
	roundToTwoDecimals,
} from '@mastra/evals/scorers/utils';
import { outdent } from 'outdent';
import { z } from 'zod';

import config from '@/config';

const bulletConceptAnnotationAnalysisSchema = z.object({
	ontologyValidity: z.number().min(0).max(1),
	grounding: z.number().min(0).max(1),
	coverage: z.number().min(0).max(1),
	calibrationAndParsimony: z.number().min(0).max(1),
	explanation: z.string().trim().min(1),
});

export const bulletConceptAnnotationQualityScorer = createScorer({
	id: 'bullet-concept-annotation-quality',
	name: 'Bullet Concept Annotation Quality',
	description:
		'Evaluates whether bullet concept assertions are valid, grounded, complete, and restrained',
	type: 'agent',
	judge: {
		model: config.llms.defaultModel,
		instructions: outdent`
			You are a strict evaluator of semantic annotations for resume bullets.
			Judge only whether the annotation accurately represents the supplied bullet.
			Do not reward plausible but unstated context, technology, impact, ownership,
			or capability. Return only structured data matching the requested schema.
		`,
	},
})
	.preprocess(({ run }) => ({
		bulletText: getUserMessageFromRunInput(run.input) ?? '',
		annotationOutput: getAssistantMessageFromRunOutput(run.output) ?? '',
	}))
	.analyze({
		description: 'Judge the semantic quality of a bullet concept annotation',
		outputSchema: bulletConceptAnnotationAnalysisSchema,
		createPrompt: ({ results }) => outdent`
			Evaluate the concept annotation for this resume bullet.

			<bullet>
			${results.preprocessStepResult.bulletText}
			</bullet>

			<annotation>
			${results.preprocessStepResult.annotationOutput}
			</annotation>

			A valid annotation is an object containing a meanings array. Each meaning must
			use exactly one of these relation and vocabulary pairs:
			- is-a → fact-type
			- relates-to → entity
			- about → topic
			- uses → technology
			- demonstrates → capability
			- supports → outcome
			- produced → artifact

			Evaluate four qualities from 0 to 1:
			- ontologyValidity: Every assertion uses a permitted relation/vocabulary pair,
			  has a concise label and stable key, uses <entity-type>:<identifier> for entity
			  keys, and represents the intended semantic category.
			- grounding: Every entity and technology is explicitly named. Capabilities are
			  evidenced by an action. Outcomes and artifacts are stated or directly entailed.
			  Penalize invented context, metrics, impact, ownership, and implementation.
			- coverage: The annotation captures the important concepts actually present,
			  including one clear fact type and every explicitly named technology when
			  applicable. Do not penalize omission of speculative or weak concepts.
			- calibrationAndParsimony: Confidence is 1 for explicit statements and 0.8–0.95
			  for strong direct entailments; assertions below 0.8 are omitted. Concepts are
			  reusable, concise, non-duplicative, and not fragments copied from the bullet.

			An empty meanings array is correct when the bullet supplies too little evidence.
			If the annotation is missing, malformed, or not structured as meanings, score all
			affected qualities at 0. Explain the most important strength or failure concisely.
		`,
	})
	.generateScore(({ results }) => {
		const analysis = results.analyzeStepResult;
		return roundToTwoDecimals(
			analysis.ontologyValidity * 0.25 +
				analysis.grounding * 0.35 +
				analysis.coverage * 0.25 +
				analysis.calibrationAndParsimony * 0.15,
		);
	})
	.generateReason(({ results, score }) => {
		const analysis = results.analyzeStepResult;
		return outdent`
			Bullet concept annotation quality: ${score}. Ontology validity=${analysis.ontologyValidity},
			grounding=${analysis.grounding}, coverage=${analysis.coverage}, and calibration
			and parsimony=${analysis.calibrationAndParsimony}. ${analysis.explanation}
		`;
	});
