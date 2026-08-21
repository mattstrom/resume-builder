import { randomUUID } from 'node:crypto';

import { MASTRA_AUTH_TOKEN_KEY } from '@mastra/core/request-context';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import {
	agentSearchCandidateSchema,
	agentSearchInputSchema,
	agentSearchOutputSchema,
	type AgentSearchCandidate,
} from '@resume-builder/entities';
import { outdent } from 'outdent';
import { z } from 'zod';

import { searchPlannerAgent } from '../agents/search-planner.agent';
import { searchRankerAgent } from '../agents/search-ranker.agent';
import { withResumeBuilderTools } from '../mcp/resume-builder.mcp';

const SEARCH_TIMEOUT_MS = 15_000;
const MAX_RETRIEVAL_CANDIDATES = 60;

const planSchema = z.object({
	interpretation: z.string().trim().min(1),
	queries: z.array(z.string().trim().min(2)).min(1).max(4),
});

const plannedSearchSchema = agentSearchInputSchema.extend({
	interpretation: z.string(),
	expandedQueries: z.array(z.string()).min(1).max(4),
	degraded: z.boolean(),
	deadline: z.number(),
});

const retrievedSearchSchema = plannedSearchSchema.extend({
	candidates: z
		.array(agentSearchCandidateSchema)
		.max(MAX_RETRIEVAL_CANDIDATES),
});

const rankingSchema = z.object({
	rankings: z.array(
		z.object({
			id: z.string().min(1),
			score: z.number().min(0).max(1),
			reason: z.string().trim().min(1),
		}),
	),
});

const planSearchStep = createStep({
	id: 'plan-agent-search',
	description: 'Interprets the request and creates bounded retrieval queries',
	inputSchema: agentSearchInputSchema,
	outputSchema: plannedSearchSchema,
	execute: async ({ inputData }) => {
		const deadline = Date.now() + SEARCH_TIMEOUT_MS;
		try {
			const response = await searchPlannerAgent.generate(
				outdent`
					Search request: ${inputData.query}
					Requested result types: ${inputData.resultTypes.join(', ')}

					Return two to four useful retrieval queries. Include the original request.
				`,
				{
					structuredOutput: { schema: planSchema },
					modelSettings: { temperature: 0, maxOutputTokens: 600 },
					abortSignal: AbortSignal.timeout(remaining(deadline)),
				},
			);
			return {
				...inputData,
				interpretation: response.object.interpretation,
				expandedQueries: normalizeQueries(
					inputData.query,
					response.object.queries,
				),
				degraded: false,
				deadline,
			};
		} catch {
			return {
				...inputData,
				interpretation: inputData.query,
				expandedQueries: [inputData.query],
				degraded: true,
				deadline,
			};
		}
	},
});

const retrieveCandidatesStep = createStep({
	id: 'retrieve-agent-search-candidates',
	description: 'Runs expanded hybrid searches and merges verified candidates',
	inputSchema: plannedSearchSchema,
	outputSchema: retrievedSearchSchema,
	requestContextSchema: z.object({ [MASTRA_AUTH_TOKEN_KEY]: z.string() }),
	execute: async ({ inputData, requestContext }) => {
		const token = requestContext.get(MASTRA_AUTH_TOKEN_KEY) ?? '';
		try {
			const candidateSets = await withDeadline(
				withResumeBuilderTools(token, (tools) =>
					Promise.all(
						inputData.expandedQueries.map(async (query, index) => {
							const result = await tools.search_profile_evidence
								.execute!(
								{
									query,
									resultTypes: inputData.resultTypes,
									limit: MAX_RETRIEVAL_CANDIDATES,
								} as any,
								{} as any,
							);
							const candidates = z
								.array(agentSearchCandidateSchema)
								.parse(result.candidates);
							return candidates.map((candidate) =>
								index === 0
									? candidate
									: {
											...candidate,
											matchKinds: [
												...new Set([
													...candidate.matchKinds,
													'expanded' as const,
												]),
											],
										},
							);
						}),
					),
				),
				inputData.deadline,
			);
			return {
				...inputData,
				candidates: mergeCandidates(candidateSets).slice(
					0,
					MAX_RETRIEVAL_CANDIDATES,
				),
			};
		} catch {
			return { ...inputData, degraded: true, candidates: [] };
		}
	},
});

const rankCandidatesStep = createStep({
	id: 'rank-agent-search-candidates',
	description:
		'Reranks only verified candidates and supplies concise reasons',
	inputSchema: retrievedSearchSchema,
	outputSchema: agentSearchOutputSchema,
	execute: async ({ inputData }) => {
		const searchRunId = randomUUID();
		if (inputData.candidates.length === 0) {
			return {
				searchRunId,
				interpretation: inputData.interpretation,
				expandedQueries: inputData.expandedQueries,
				degraded: inputData.degraded,
				results: [],
			};
		}
		if (inputData.degraded) {
			return {
				searchRunId,
				interpretation: inputData.interpretation,
				expandedQueries: inputData.expandedQueries,
				degraded: true,
				results: fallbackResults(inputData.candidates, inputData.limit),
			};
		}

		try {
			const response = await searchRankerAgent.generate(
				outdent`
					Original search: ${inputData.query}
					Interpretation: ${inputData.interpretation}
					Candidates:
					${JSON.stringify(inputData.candidates)}

					Rank the candidates. Candidate IDs must be copied exactly.
				`,
				{
					structuredOutput: { schema: rankingSchema },
					modelSettings: { temperature: 0, maxOutputTokens: 5000 },
					abortSignal: AbortSignal.timeout(
						remaining(inputData.deadline),
					),
				},
			);
			return {
				searchRunId,
				interpretation: inputData.interpretation,
				expandedQueries: inputData.expandedQueries,
				degraded: inputData.degraded,
				results: rankedResults(
					inputData.candidates,
					response.object.rankings,
					inputData.limit,
				),
			};
		} catch {
			return {
				searchRunId,
				interpretation: inputData.interpretation,
				expandedQueries: inputData.expandedQueries,
				degraded: true,
				results: fallbackResults(inputData.candidates, inputData.limit),
			};
		}
	},
});

export const agentSearchWorkflow = createWorkflow({
	id: 'agent-search-workflow',
	description:
		'Expands, retrieves, and reranks profile evidence with bounded agents',
	inputSchema: agentSearchInputSchema,
	outputSchema: agentSearchOutputSchema,
})
	.then(planSearchStep)
	.then(retrieveCandidatesStep)
	.then(rankCandidatesStep)
	.commit();

export function normalizeQueries(
	original: string,
	proposed: string[],
): string[] {
	const queries = [original, ...proposed]
		.map((query) => query.trim())
		.filter((query) => query.length >= 2);
	const unique = new Map<string, string>();
	for (const query of queries) {
		const key = query.toLocaleLowerCase();
		if (!unique.has(key)) unique.set(key, query);
	}
	return [...unique.values()].slice(0, 4);
}

export function mergeCandidates(
	candidateSets: AgentSearchCandidate[][],
): AgentSearchCandidate[] {
	const merged = new Map<string, AgentSearchCandidate>();
	for (const candidate of candidateSets.flat()) {
		const current = merged.get(candidate.id);
		if (!current) {
			merged.set(candidate.id, structuredClone(candidate));
			continue;
		}
		current.baseScore = Math.max(current.baseScore, candidate.baseScore);
		current.matchKinds = [
			...new Set([...current.matchKinds, ...candidate.matchKinds]),
		];
	}
	return [...merged.values()].sort(
		(left, right) =>
			right.baseScore - left.baseScore || left.id.localeCompare(right.id),
	);
}

export function rankedResults(
	candidates: AgentSearchCandidate[],
	rankings: Array<{ id: string; score: number; reason: string }>,
	limit: number,
) {
	const candidateById = new Map(
		candidates.map((candidate) => [candidate.id, candidate]),
	);
	const used = new Set<string>();
	const ranked = rankings.flatMap((ranking) => {
		const candidate = candidateById.get(ranking.id);
		if (!candidate || used.has(ranking.id)) return [];
		used.add(ranking.id);
		const { baseScore: _baseScore, ...result } = candidate;
		return [{ ...result, score: ranking.score, reason: ranking.reason }];
	});
	const omitted = candidates.flatMap((candidate) => {
		if (used.has(candidate.id)) return [];
		const { baseScore, ...result } = candidate;
		return [
			{
				...result,
				score: baseScore,
				reason: 'Retrieved as related profile evidence.',
			},
		];
	});
	return [...ranked, ...omitted]
		.sort(
			(left, right) =>
				right.score - left.score || left.id.localeCompare(right.id),
		)
		.slice(0, limit);
}

export function fallbackResults(
	candidates: AgentSearchCandidate[],
	limit: number,
) {
	return candidates.slice(0, limit).map(({ baseScore, ...candidate }) => ({
		...candidate,
		score: baseScore,
		reason: 'Ranked by hybrid lexical and vector retrieval.',
	}));
}

function remaining(deadline: number): number {
	return Math.max(1, deadline - Date.now());
}

async function withDeadline<T>(
	promise: Promise<T>,
	deadline: number,
): Promise<T> {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) =>
			setTimeout(
				() => reject(new Error('Agent search timed out')),
				remaining(deadline),
			),
		),
	]);
}
