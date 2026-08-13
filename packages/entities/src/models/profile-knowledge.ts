import { z } from 'zod';

const profileMeaningVocabularyByRelation = {
	'is-a': 'fact-type',
	'relates-to': 'entity',
	about: 'topic',
	uses: 'technology',
	demonstrates: 'capability',
	supports: 'outcome',
	produced: 'artifact',
} as const;

export const evidenceGradeSchema = z.enum(['strong', 'moderate', 'weak', 'missing']);

export const profileFactMeaningSchema = z.object({
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
		key: z.string().trim().min(1),
		label: z.string().trim().min(1),
	}),
	source: z.literal('user-feedback').default('user-feedback'),
	confidence: z.number().min(0).max(1).default(1),
});

export const profileFactProposalSchema = z
	.object({
		what: z.string().trim().min(1).max(500),
		impact: z.string().trim().max(500).nullish(),
		scale: z.string().trim().max(500).nullish(),
		meanings: z.array(profileFactMeaningSchema).min(2).max(12),
	})
	.superRefine((fact, context) => {
		for (const [index, meaning] of fact.meanings.entries()) {
			if (
				meaning.concept.vocabulary !== profileMeaningVocabularyByRelation[meaning.relation]
			) {
				context.addIssue({
					code: 'custom',
					path: ['meanings', index, 'concept', 'vocabulary'],
					message: `A ${meaning.relation} meaning requires the ${profileMeaningVocabularyByRelation[meaning.relation]} vocabulary`,
				});
			}
		}
		if (fact.meanings.filter(({ relation }) => relation === 'is-a').length !== 1) {
			context.addIssue({
				code: 'custom',
				path: ['meanings'],
				message: 'A fact requires exactly one is-a meaning',
			});
		}
		if (!fact.meanings.some(({ relation }) => relation === 'relates-to')) {
			context.addIssue({
				code: 'custom',
				path: ['meanings'],
				message: 'A fact requires at least one relates-to meaning',
			});
		}
	});

export const profileKnowledgeProposalSchema = z
	.object({
		kind: z.enum(['fact', 'requirement-interpretation', 'scoring-guidance']),
		title: z.string().trim().min(1).max(120),
		rationale: z.string().trim().min(1).max(500),
		fact: profileFactProposalSchema.optional(),
		guidance: z.string().trim().min(1).max(500).optional(),
	})
	.superRefine((proposal, context) => {
		if (proposal.kind === 'fact' && !proposal.fact) {
			context.addIssue({ code: 'custom', path: ['fact'], message: 'Fact proposal required' });
		}
		if (proposal.kind !== 'fact' && !proposal.guidance) {
			context.addIssue({
				code: 'custom',
				path: ['guidance'],
				message: 'Guidance text required',
			});
		}
	});

export const profileCuratorInputSchema = z.object({
	feedbackId: z.string().trim().min(1),
	requirement: z.object({
		id: z.string().trim().min(1),
		what: z.string().trim().min(1),
		concepts: z.array(z.object({ label: z.string(), relation: z.string() })),
	}),
	agentGrade: evidenceGradeSchema,
	manualGrade: evidenceGradeSchema,
	explanation: z.string().trim().min(1).max(2000),
	existingFacts: z.array(
		z.object({
			id: z.string(),
			what: z.string(),
			concepts: z.array(z.object({ relation: z.string(), label: z.string() })),
		}),
	),
});

export const profileCuratorOutputSchema = z.object({
	proposals: z.array(profileKnowledgeProposalSchema).max(5),
});

export type EvidenceGrade = z.infer<typeof evidenceGradeSchema>;
export type ProfileKnowledgeProposal = z.infer<typeof profileKnowledgeProposalSchema>;
export type ProfileCuratorInput = z.infer<typeof profileCuratorInputSchema>;
export type ProfileCuratorOutput = z.infer<typeof profileCuratorOutputSchema>;
