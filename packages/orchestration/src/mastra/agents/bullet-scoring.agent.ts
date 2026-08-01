import { Agent } from '@mastra/core/agent';
import { outdent } from 'outdent';

import config from '@/config';

import { bulletScoringQualityScorer } from '../scorers/bullet-scoring-quality.scorer';

export const bulletScoringAgent = new Agent({
	id: 'bullet-scoring-agent',
	name: 'Bullet Scoring Agent',
	model: config.llms.defaultModel,
	scorers: {
		bulletScoringQuality: {
			scorer: bulletScoringQualityScorer,
			sampling: { type: 'none' },
		},
	},
	instructions: outdent`
		Evaluate one resume bullet. Score only the text provided; do not rewrite it,
		invent facts, infer unstated metrics, or exaggerate ownership.

		Use this scale for every dimension:
		- 1.00: strong; fully satisfies the dimension
		- 0.75: good; clear evidence with a minor gap
		- 0.50: mixed; some evidence with a meaningful gap
		- 0.25: weak; only a hint of the dimension
		- 0.00: absent

		Context: Does the bullet explain the problem, purpose, constraint, or scope?
		Useful scope includes users, teams, revenue, scale, latency, reliability,
		complexity, or organizational setting.

		Action: Is the person's contribution concrete and owned? Look for a specific
		action verb, clear ownership, meaningful implementation or decision-making,
		and relevant expertise. Penalize vague language such as "worked on",
		"helped with", or "responsible for".

		Outcome: Does the bullet state what changed, shipped, improved, or became
		possible? Prefer measurable impact, but observable outcomes such as reduced
		manual work, improved reliability, an unblocked launch, or reusable
		infrastructure are valid. Never require or invent a metric when the result is
		otherwise concrete.

		Clarity: Is the bullet specific, grammatical, concise, logically ordered, and
		truthful? Prefer roughly 80 to 400 characters. Penalize unnecessary jargon,
		inflated claims, ambiguity, and AI-like phrasing such as em dashes.

		For each note, briefly identify the evidence in the bullet and the most
		important missing detail, if any. Keep each note to one concise sentence.
	`,
});
