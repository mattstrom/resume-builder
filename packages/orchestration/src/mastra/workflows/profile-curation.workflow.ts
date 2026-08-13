import { MASTRA_RESOURCE_ID_KEY } from '@mastra/core/request-context';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { profileCuratorInputSchema, profileCuratorOutputSchema } from '@resume-builder/entities';
import { outdent } from 'outdent';
import { z } from 'zod';

import { profileCuratorFormatterAgent } from '../agents/profile-curator-formatter.agent';
import { profileCuratorAgent } from '../agents/profile-curator.agent';

// Keep the model-facing schema free of refinements, defaults, and optional object
// branches. Some providers accept those through Zod but fail to return an object.
const rawProfileCuratorOutputSchema = z.object({
	proposals: z
		.array(
			z.object({
				kind: z.enum(['fact', 'requirement-interpretation', 'scoring-guidance']),
				title: z.string(),
				rationale: z.string(),
				fact: z
					.object({
						what: z.string(),
						impact: z.string().nullable(),
						scale: z.string().nullable(),
						meanings: z.array(
							z.object({
								relation: z.enum([
									'is-a',
									'relates-to',
									'about',
									'uses',
									'demonstrates',
									'supports',
									'produced',
								]),
								concept: z.object({
									vocabulary: z.enum([
										'fact-type',
										'entity',
										'topic',
										'technology',
										'capability',
										'outcome',
										'artifact',
									]),
									key: z.string(),
									label: z.string(),
								}),
								source: z.literal('user-feedback'),
								confidence: z.number(),
							}),
						),
					})
					.nullable(),
				guidance: z.string().nullable(),
			}),
		)
		.max(5),
});

function parseJsonText(text: string): unknown {
	const trimmed = text.trim();
	const unfenced = trimmed.startsWith('```')
		? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
		: trimmed;
	return JSON.parse(unfenced);
}

const curateProfileFeedbackStep = createStep({
	id: 'curate-profile-feedback',
	description: 'Produces reviewable profile knowledge proposals from explicit grade feedback',
	inputSchema: profileCuratorInputSchema,
	outputSchema: profileCuratorOutputSchema,
	execute: async ({ inputData, requestContext }) => {
		const resourceId = String(requestContext.get(MASTRA_RESOURCE_ID_KEY) ?? 'anonymous');
		let curatorDraft = '';
		try {
			const curatorResponse = await profileCuratorAgent.generate(
				outdent`
					Requirement grade feedback:
					${JSON.stringify(inputData, null, 2)}
				`,
				{
					requestContext,
					memory: {
						thread: `profile-feedback:${inputData.feedbackId}`,
						resource: resourceId,
					},
					modelSettings: { temperature: 0, maxOutputTokens: 3000 },
				},
			);
			curatorDraft = curatorResponse.text.trim();
		} catch (error) {
			// Durable feedback and proposal generation must not depend on experimental
			// observational-memory processing. The formatter still receives the complete
			// user correction below.
			console.warn('Profile curator memory observation failed', error);
		}

		const formatterResponse = await profileCuratorFormatterAgent.generate(
			outdent`
				Source feedback:
				${JSON.stringify(inputData, null, 2)}

				Curator draft:
				${curatorDraft || '(No draft was emitted; derive proposals only from the source feedback.)'}
			`,
			{
				requestContext,
				structuredOutput: { schema: rawProfileCuratorOutputSchema },
				modelSettings: { temperature: 0, maxOutputTokens: 3000 },
			},
		);

		let rawOutput: unknown = formatterResponse.object;
		if (!rawOutput && formatterResponse.text.trim()) {
			rawOutput = parseJsonText(formatterResponse.text);
		}
		const formatted = rawProfileCuratorOutputSchema.parse(rawOutput);

		return profileCuratorOutputSchema.parse({
			proposals: formatted.proposals.map((proposal) => ({
				kind: proposal.kind,
				title: proposal.title,
				rationale: proposal.rationale,
				...(proposal.fact ? { fact: proposal.fact } : {}),
				...(proposal.guidance ? { guidance: proposal.guidance } : {}),
			})),
		});
	},
});

export const profileCurationWorkflow = createWorkflow({
	id: 'profile-curation-workflow',
	description: 'Converts user corrections into proposals for durable profile knowledge',
	inputSchema: profileCuratorInputSchema,
	outputSchema: profileCuratorOutputSchema,
})
	.then(curateProfileFeedbackStep)
	.commit();
