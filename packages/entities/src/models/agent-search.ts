import { z } from 'zod';

export const agentSearchResultTypeSchema = z.enum([
	'SUMMARY',
	'SKILL',
	'PROJECT',
	'WORK_HISTORY',
	'VOLUNTEERING',
	'FACT',
	'BULLET',
	'CONCEPT',
	'PROFESSIONAL_STATEMENT',
]);

export const agentSearchMatchKindSchema = z.enum([
	'lexical',
	'vector',
	'expanded',
]);

export const agentSearchLocatorSchema = z.object({
	kind: z.enum(['resume', 'bullet', 'profile']),
	resumeId: z.string().optional(),
	applicationId: z.string().optional(),
	bulletId: z.string().optional(),
	sourceType: z.enum(['job', 'project', 'volunteering']).optional(),
	sourceId: z.string().optional(),
	section: z
		.enum([
			'skills',
			'projects',
			'work-history',
			'volunteering',
			'facts',
			'concepts',
			'statements',
		])
		.optional(),
});

export const agentSearchCandidateSchema = z.object({
	id: z.string().min(1),
	type: agentSearchResultTypeSchema,
	title: z.string(),
	excerpt: z.string(),
	source: z.string(),
	locator: agentSearchLocatorSchema,
	baseScore: z.number().min(0).max(1),
	matchKinds: z.array(agentSearchMatchKindSchema).min(1),
});

export const agentSearchResultSchema = agentSearchCandidateSchema
	.omit({ baseScore: true })
	.extend({
		score: z.number().min(0).max(1),
		reason: z.string(),
	});

export const agentSearchInputSchema = z.object({
	query: z.string().trim().min(2),
	resultTypes: z.array(agentSearchResultTypeSchema).min(1),
	limit: z.number().int().min(1).max(50).default(50),
});

export const agentSearchOutputSchema = z.object({
	searchRunId: z.string().min(1),
	interpretation: z.string(),
	expandedQueries: z.array(z.string()).min(1).max(4),
	degraded: z.boolean(),
	results: z.array(agentSearchResultSchema),
});

export type AgentSearchResultType = z.infer<typeof agentSearchResultTypeSchema>;
export type AgentSearchMatchKind = z.infer<typeof agentSearchMatchKindSchema>;
export type AgentSearchLocator = z.infer<typeof agentSearchLocatorSchema>;
export type AgentSearchCandidate = z.infer<typeof agentSearchCandidateSchema>;
export type AgentSearchInput = z.infer<typeof agentSearchInputSchema>;
export type AgentSearchOutput = z.infer<typeof agentSearchOutputSchema>;
export type AgentSearchResult = z.infer<typeof agentSearchResultSchema>;
