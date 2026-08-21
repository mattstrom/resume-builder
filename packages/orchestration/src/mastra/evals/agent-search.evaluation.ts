import type { AgentSearchResultType } from '@resume-builder/entities';

export interface AgentSearchEvaluationCase {
	id: string;
	category:
		| 'ambiguous'
		| 'synonym'
		| 'multi-constraint'
		| 'exact'
		| 'no-result';
	query: string;
	resultTypes: AgentSearchResultType[];
	/** Relevance grades: 3 direct, 2 strong, 1 related, 0 irrelevant. */
	relevance: Record<string, number>;
}

export const agentSearchEvaluationCases: AgentSearchEvaluationCase[] = [
	{
		id: 'ambiguous-platform-work',
		category: 'ambiguous',
		query: 'platform work',
		resultTypes: ['PROJECT', 'WORK_HISTORY', 'BULLET'],
		relevance: {
			'BULLET:platform-reliability': 3,
			'PROJECT:internal-platform': 2,
		},
	},
	{
		id: 'synonym-site-reliability',
		category: 'synonym',
		query: 'SRE and production resilience',
		resultTypes: ['SKILL', 'BULLET', 'CONCEPT'],
		relevance: {
			'CONCEPT:site-reliability-engineering': 3,
			'BULLET:incident-response': 2,
		},
	},
	{
		id: 'multi-constraint-leadership',
		category: 'multi-constraint',
		query: 'technical leadership involving Kubernetes and measurable reliability gains',
		resultTypes: ['PROJECT', 'WORK_HISTORY', 'FACT', 'BULLET'],
		relevance: {
			'BULLET:kubernetes-leadership': 3,
			'FACT:reliability-impact': 3,
		},
	},
	{
		id: 'exact-technology-name',
		category: 'exact',
		query: 'Kubernetes',
		resultTypes: ['SKILL', 'PROJECT', 'CONCEPT'],
		relevance: {
			'SKILL:kubernetes': 3,
			'CONCEPT:kubernetes': 3,
		},
	},
	{
		id: 'no-result-quantum',
		category: 'no-result',
		query: 'quantum compiler design',
		resultTypes: ['PROJECT', 'WORK_HISTORY', 'BULLET'],
		relevance: {},
	},
];

export function recallAt(
	resultIds: string[],
	relevance: Record<string, number>,
	k = 10,
): number {
	const relevantIds = Object.entries(relevance)
		.filter(([, grade]) => grade > 0)
		.map(([id]) => id);
	if (relevantIds.length === 0)
		return resultIds.slice(0, k).length === 0 ? 1 : 0;
	const returned = new Set(resultIds.slice(0, k));
	return (
		relevantIds.filter((id) => returned.has(id)).length / relevantIds.length
	);
}

export function ndcgAt(
	resultIds: string[],
	relevance: Record<string, number>,
	k = 10,
): number {
	const dcg = resultIds.slice(0, k).reduce((score, id, index) => {
		const grade = relevance[id] ?? 0;
		return score + (2 ** grade - 1) / Math.log2(index + 2);
	}, 0);
	const ideal = Object.values(relevance)
		.sort((left, right) => right - left)
		.slice(0, k)
		.reduce(
			(score, grade, index) =>
				score + (2 ** grade - 1) / Math.log2(index + 2),
			0,
		);
	return ideal === 0
		? resultIds.slice(0, k).length === 0
			? 1
			: 0
		: dcg / ideal;
}

export function passesAgentSearchReleaseGate(
	agentResults: Record<string, string[]>,
	vectorResults: Record<string, string[]>,
): boolean {
	const metrics = agentSearchEvaluationCases.map((evaluation) => ({
		agentNdcg: ndcgAt(
			agentResults[evaluation.id] ?? [],
			evaluation.relevance,
		),
		vectorNdcg: ndcgAt(
			vectorResults[evaluation.id] ?? [],
			evaluation.relevance,
		),
		agentRecall: recallAt(
			agentResults[evaluation.id] ?? [],
			evaluation.relevance,
		),
		vectorRecall: recallAt(
			vectorResults[evaluation.id] ?? [],
			evaluation.relevance,
		),
	}));
	const average = (values: number[]) =>
		values.reduce((total, value) => total + value, 0) / values.length;
	return (
		average(metrics.map(({ agentNdcg }) => agentNdcg)) >
			average(metrics.map(({ vectorNdcg }) => vectorNdcg)) &&
		average(metrics.map(({ agentRecall }) => agentRecall)) >=
			average(metrics.map(({ vectorRecall }) => vectorRecall))
	);
}
