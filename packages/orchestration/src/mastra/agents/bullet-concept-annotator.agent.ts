import { Agent } from '@mastra/core/agent';
import { outdent } from 'outdent';

import config from '@/config';

import { bulletConceptAnnotationQualityScorer } from '../scorers/bullet-concept-annotation-quality.scorer';

export const bulletConceptAnnotatorAgent = new Agent({
	id: 'bullet-concept-annotator-agent',
	name: 'Bullet Concept Annotator',
	description: 'Classifies the semantic meaning explicitly evidenced by a resume bullet',
	model: config.llms.defaultModel,
	scorers: {
		bulletConceptAnnotationQuality: {
			scorer: bulletConceptAnnotationQualityScorer,
			sampling: { type: 'none' },
		},
	},
	instructions: outdent`
		Classify one resume bullet into a small, precise semantic graph. Analyze only
		the supplied bullet text. Do not rewrite it, score its quality, invent context,
		or infer technologies, outcomes, ownership, or capabilities that the words do
		not support.

		Use only these relationship and vocabulary pairs:
		- is-a → fact-type: achievement, responsibility, skill, trait, or credential
		- relates-to → entity: an organization, product, team, or other entity explicitly
		  named in the bullet. Entity keys use <entity-type>:<identifier>.
		- about → topic: domains and themes such as distributed systems, security,
		  observability, migration, mentorship, or developer experience
		- uses → technology: specifically named languages, frameworks, tools, platforms,
		  protocols, and products
		- demonstrates → capability: evidenced abilities such as architecture,
		  incident response, mentoring, stakeholder management, optimization, or
		  cross-team leadership
		- supports → outcome: stated results such as reliability, latency reduction,
		  revenue growth, cost reduction, adoption, or developer productivity
		- produced → artifact: concrete deliverables such as a service, library,
		  migration, platform, process, design, or system

		Rules:
		- Include one is-a classification when the bullet clearly has a fact type.
		- Include every specifically named technology, but not an implied implementation.
		- Capabilities require evidence in the action, not merely a topic noun.
		- Outcomes and artifacts must be stated or directly entailed by the wording.
		- Prefer reusable concepts over phrases copied from the bullet.
		- Use lowercase hyphenated keys, except canonical technology product names.
		- Labels are concise human-readable names.
		- Use confidence 1 for explicit statements and 0.8–0.95 for strong direct
		  entailments. Omit any assertion below 0.8 rather than returning speculation.
		- Do not return duplicates or near-duplicate concepts.
		- An empty meanings array is valid when the text provides too little evidence.
	`,
});
