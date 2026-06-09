import { Agent } from '@mastra/core/agent';
import { createStep } from '@mastra/core/workflows';
import { narrativeNodeSchema } from '@resume-builder/entities';
import { outdent } from 'outdent';
import { z } from 'zod';

import config from '@/config';

const topicHints = [
	'employment',
	'education',
	'project',
	'volunteering',
	'skill',
	'transition',
	'unclear',
];

const SEGMENTATION_SYSTEM_PROMPT = outdent`
	You are analyzing a career narrative to identify episode boundaries.
	
	An episode is a contiguous span of text that coheres around a single career context: 
	a job, an educational period, a project, a period of volunteering, or a transitional 
	reflection between contexts.
	
	Identify boundaries where the primary context shifts. A context shift occurs when:
	- The organization, institution, or project changes
	- The time period clearly advances to a new phase
	- The subject moves from describing experience to reflecting on it, or vice versa
	
	Do not segment at every paragraph break. A single episode may span multiple paragraphs 
	if they describe the same context. Prefer fewer, meaningful segments over many fine-grained ones.
	
	For each segment, identify:
	- The verbatim opening words (first ~8 words) so the segment can be located in the source
	- The verbatim closing words (last ~8 words)
	- A temporal hint: an approximate time period if discernible, otherwise null
	- A topic hint: the most likely primary entity type this segment will yield
	
	Topic hint values: ${topicHints.join(', ')}
	
	"transition" is for reflective or connective passages that don't anchor to a specific role or institution.
	"skill" is only for passages primarily about capabilities with no clear organizational anchor.
`;

const ENRICHMENT_SYSTEM_PROMPT = outdent`
	You are classifying pre-segmented sections of a career narrative.

For each section you will receive:
- The heading (if present)
- The prose content
- Whether it contains a list

Classify the primary entity type this section will yield, and extract a temporal hint if discernible.
Topic hint values: ${topicHints.join(', ')}
`;

const segmentSchema = z.object({
	openingWords: z.string(),
	closingWords: z.string(),
	temporalHint: z.string().nullable(),
	topicHint: z.enum([
		'employment',
		'education',
		'project',
		'volunteering',
		'skill',
		'transition',
		'unclear',
	]),
});

const segmentationOutputSchema = z.object({
	segments: z.array(segmentSchema),
});

const narrativeAgent = new Agent({
	id: 'narrativeAgent',
	name: 'Narrative Segmenter',
	model: config.llms.defaultModel,
	instructions: ENRICHMENT_SYSTEM_PROMPT,
});

export const segmentStep = createStep({
	id: 'segment-narrative',
	description: 'Segment career narrative into semantic chunks',
	inputSchema: z.object({ narrative: z.array(narrativeNodeSchema) }),
	outputSchema: segmentationOutputSchema,
	execute: async ({ inputData }) => {
		const prompt = outdent`
			Please segment the following career narrative:
			
			${inputData.narrative}
		`;

		const response = await narrativeAgent.generate(prompt, {
			structuredOutput: {
				schema: segmentationOutputSchema,
			},
		});

		return response.object;
	},
});
