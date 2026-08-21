import {
	type AgentSearchResult,
	BulletSourceType,
} from '@resume-builder/entities';

import { bulletSourceRoute } from './bullet-deep-link.ts';

export type SearchResultType =
	| 'Summary'
	| 'Skill'
	| 'Project'
	| 'Work history'
	| 'Volunteering'
	| 'Fact'
	| 'Bullet'
	| 'Concept'
	| 'Professional statement';

export interface SearchTableResult {
	id: string;
	type: SearchResultType;
	title: string;
	excerpt: string;
	source: string;
	score?: number;
	relevanceLabel?: string;
	agentReason?: string;
	feedback?: boolean;
	feedbackPending?: boolean;
	onFeedback?: (relevant: boolean) => void;
	to:
		| '/editor/$applicationId'
		| '/editor/resume/$resumeId'
		| '/profile/skills'
		| '/profile/projects'
		| '/profile/work-history'
		| '/profile/volunteering'
		| '/profile/facts'
		| '/profile/concepts'
		| '/profile/statements';
	params?: Record<string, string>;
	search?: Record<string, string>;
}

const API_RESULT_TYPE_LABELS: Record<
	AgentSearchResult['type'],
	SearchResultType
> = {
	SUMMARY: 'Summary',
	SKILL: 'Skill',
	PROJECT: 'Project',
	WORK_HISTORY: 'Work history',
	VOLUNTEERING: 'Volunteering',
	FACT: 'Fact',
	BULLET: 'Bullet',
	CONCEPT: 'Concept',
	PROFESSIONAL_STATEMENT: 'Professional statement',
};

const PROFILE_SECTION_ROUTES = {
	skills: '/profile/skills',
	projects: '/profile/projects',
	'work-history': '/profile/work-history',
	volunteering: '/profile/volunteering',
	facts: '/profile/facts',
	concepts: '/profile/concepts',
	statements: '/profile/statements',
} as const;

export function agentResult(
	result: AgentSearchResult,
	feedback: boolean | undefined,
	feedbackPending: boolean,
	onFeedback: (relevant: boolean) => void,
): SearchTableResult {
	const common = {
		id: result.id,
		type: API_RESULT_TYPE_LABELS[result.type],
		title: result.title,
		excerpt: result.excerpt,
		source: result.source,
		score: result.score,
		agentReason: result.reason,
		feedback,
		feedbackPending,
		onFeedback,
	};
	if (result.locator.kind === 'resume') {
		const applicationId = result.locator.applicationId;
		return {
			...common,
			to: applicationId
				? '/editor/$applicationId'
				: '/editor/resume/$resumeId',
			params: applicationId
				? { applicationId }
				: { resumeId: result.locator.resumeId ?? '' },
			search: applicationId
				? { resumeId: result.locator.resumeId ?? '' }
				: undefined,
		};
	}
	if (result.locator.kind === 'bullet' && result.locator.sourceType) {
		return {
			...common,
			to: bulletSourceRoute(
				result.locator.sourceType as BulletSourceType,
			),
			search: { bulletId: result.locator.bulletId ?? '' },
		};
	}
	return {
		...common,
		to: PROFILE_SECTION_ROUTES[result.locator.section ?? 'facts'],
	};
}
