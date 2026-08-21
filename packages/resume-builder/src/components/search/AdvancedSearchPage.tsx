import { useQuery } from '@apollo/client/react';
import { BulletSourceType, type Resume } from '@resume-builder/entities';
import { Link } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';
import { ArrowUpDown, ExternalLink, Filter, Search, Sparkles } from 'lucide-react';
import { observer } from 'mobx-react';
import { type FormEvent, useEffect, useMemo, useReducer, useState } from 'react';
import * as Y from 'yjs';

import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card.tsx';
import { DataTable, type DataTableFeatures } from '@/components/ui/data-table.tsx';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from '@/components/ui/input-group.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { ADVANCED_SEARCH } from '@/graphql/queries.ts';
import type { ResumeSearchRecord } from '@/graphql/types.ts';
import { bulletSourceRoute } from '@/lib/bullet-deep-link.ts';
import { bulletFromGraphql, type GraphqlBullet } from '@/lib/bullet-graphql.ts';
import { buildConceptIndex, type ConceptUsage } from '@/lib/concept-index.ts';
import { useStore } from '@/stores/store.provider.tsx';

export type AdvancedSearchMode = 'keyword' | 'vector';

type ResultType =
	| 'Summary'
	| 'Skill'
	| 'Project'
	| 'Work history'
	| 'Volunteering'
	| 'Fact'
	| 'Bullet'
	| 'Concept'
	| 'Professional statement';

interface ProfessionalStatementSearchRecord {
	id: string;
	label: string;
	text: string;
}

interface AdvancedSearchResult {
	id: string;
	type: ResultType;
	title: string;
	excerpt: string;
	source: string;
	score?: number;
	relevanceLabel?: string;
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

interface AdvancedSearchData {
	advancedSearch: {
		resumes: ResumeSearchRecord[];
		bullets: Array<{ score: number; bullet: GraphqlBullet }>;
		concepts: Array<{
			score: number;
			concept: {
				id: string;
				key: string;
				label: string;
				vocabulary: string;
				definition?: string;
			};
		}>;
	};
}

interface AdvancedSearchVariables {
	query: string;
	resultTypes: AdvancedSearchApiResultType[];
	limit?: number;
	minimumScore?: number;
}

type AdvancedSearchApiResultType =
	| 'SUMMARY'
	| 'SKILL'
	| 'PROJECT'
	| 'WORK_HISTORY'
	| 'VOLUNTEERING'
	| 'FACT'
	| 'BULLET'
	| 'CONCEPT'
	| 'PROFESSIONAL_STATEMENT';

type ConceptSearchResult = {
	score: number;
	concept: {
		id: string;
		key: string;
		label: string;
		vocabulary: string;
		definition?: string;
	};
};

const columnHelper = createColumnHelper<DataTableFeatures, AdvancedSearchResult>();

function sortableHeader(label: string) {
	return ({
		column,
	}: {
		column: {
			toggleSorting(desc?: boolean): void;
			getIsSorted(): false | 'asc' | 'desc';
		};
	}) => (
		<Button
			variant="ghost"
			onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
		>
			{label}
			<ArrowUpDown data-icon="inline-end" />
		</Button>
	);
}

const columns = columnHelper.columns([
	columnHelper.accessor('title', {
		header: sortableHeader('Result'),
		cell: ({ row }) => (
			<div className="flex min-w-64 max-w-2xl flex-col gap-1">
				<span className="font-medium leading-5">{row.original.title}</span>
				<span className="line-clamp-2 text-sm leading-5 text-muted-foreground">
					{row.original.excerpt}
				</span>
			</div>
		),
	}),
	columnHelper.accessor('source', {
		header: sortableHeader('Source'),
		cell: ({ getValue }) => (
			<span className="whitespace-nowrap text-sm text-muted-foreground">{getValue()}</span>
		),
	}),
	columnHelper.accessor((row) => row.score ?? -1, {
		id: 'score',
		header: sortableHeader('Relevance'),
		cell: ({ row }) =>
			row.original.relevanceLabel ? (
				<span className="whitespace-nowrap text-sm text-muted-foreground">
					{row.original.relevanceLabel}
				</span>
			) : row.original.score === undefined ? (
				<span className="text-sm text-muted-foreground">Keyword</span>
			) : (
				<span className="font-mono text-sm">{Math.round(row.original.score * 100)}%</span>
			),
	}),
	columnHelper.display({
		id: 'actions',
		header: () => <span className="sr-only">Open result</span>,
		cell: ({ row }) => (
			<Button variant="ghost" size="sm" asChild>
				<Link
					to={row.original.to as never}
					params={row.original.params as never}
					search={row.original.search as never}
				>
					Open
					<ExternalLink data-icon="inline-end" />
				</Link>
			</Button>
		),
	}),
]);

export const AdvancedSearchPage = observer(function AdvancedSearchPage() {
	const {
		bulletsStore,
		factsStore,
		jobsStore,
		projectsStore,
		profileStore,
		resumeStore,
		skillsStore,
		volunteeringStore,
	} = useStore();
	const [query, setQuery] = useState('');
	const [submittedQuery, setSubmittedQuery] = useState('');
	const [mode, setMode] = useState<AdvancedSearchMode>('keyword');
	const [submittedMode, setSubmittedMode] = useState<AdvancedSearchMode>('keyword');
	const [selectedTypes, setSelectedTypes] = useState<Set<ResultType>>(
		() => new Set(RESULT_TYPES),
	);
	const vectorSearchEnabled = submittedMode === 'vector' && submittedQuery.length >= 2;
	const selectedApiResultTypes = [...selectedTypes].map((type) => RESULT_TYPE_API_VALUES[type]);

	useEffect(() => {
		void profileStore.connect();
		return () => profileStore.disconnect();
	}, [profileStore]);

	const professionalStatements = useProfessionalStatements(
		profileStore.professionalStatementsArray,
	);
	const conceptUsages = useMemo(
		() => buildConceptIndex(bulletsStore.bullets),
		[bulletsStore.bullets],
	);

	const {
		data: advancedSearchData,
		loading,
		error: searchError,
	} = useQuery<AdvancedSearchData, AdvancedSearchVariables>(ADVANCED_SEARCH, {
		variables: {
			query: submittedQuery,
			resultTypes: selectedApiResultTypes,
			limit: 50,
			minimumScore: 0.45,
		},
		skip: !vectorSearchEnabled || selectedTypes.size === 0,
		fetchPolicy: 'network-only',
	});

	const keywordResults = useMemo(
		() =>
			submittedMode === 'keyword'
				? buildKeywordResults(submittedQuery, {
						bullets: bulletsStore.bullets,
						concepts: conceptUsages,
						facts: factsStore.facts,
						jobs: jobsStore.jobs,
						projects: projectsStore.projects,
						professionalStatements,
						resumes: resumeStore.data,
						skills: skillsStore.skills,
						volunteering: volunteeringStore.volunteering,
					})
				: [],
		[
			bulletsStore.bullets,
			conceptUsages,
			factsStore.facts,
			jobsStore.jobs,
			projectsStore.projects,
			professionalStatements,
			resumeStore.data,
			skillsStore.skills,
			submittedMode,
			submittedQuery,
			volunteeringStore.volunteering,
		],
	);
	const vectorResults = useMemo(
		() =>
			vectorSearchEnabled
				? buildVectorResults({
						bullets: advancedSearchData?.advancedSearch.bullets ?? [],
						concepts: advancedSearchData?.advancedSearch.concepts ?? [],
						facts: factsStore.facts,
						projects: projectsStore.projects,
						professionalStatements,
						query: submittedQuery,
						resumes: advancedSearchData?.advancedSearch.resumes ?? [],
						skills: skillsStore.skills,
						sources: {
							jobs: jobsStore.jobs,
							projects: projectsStore.projects,
							volunteering: volunteeringStore.volunteering,
						},
					})
				: [],
		[
			advancedSearchData,
			factsStore.facts,
			jobsStore.jobs,
			projectsStore.projects,
			professionalStatements,
			skillsStore.skills,
			vectorSearchEnabled,
			volunteeringStore.volunteering,
		],
	);
	const allResults = submittedMode === 'vector' ? vectorResults : keywordResults;
	const resultGroups = RESULT_TYPES.filter((type) => selectedTypes.has(type)).map((type) => ({
		type,
		results: allResults.filter((result) => result.type === type),
	}));
	const resultCount = resultGroups.reduce((count, group) => count + group.results.length, 0);
	const searched = submittedQuery.length >= 2;

	const submit = (event: FormEvent) => {
		event.preventDefault();
		const nextQuery = query.trim();
		setSubmittedQuery(nextQuery);
		setSubmittedMode(mode);
	};
	const toggleResultType = (type: ResultType) => {
		setSelectedTypes((current) => {
			const next = new Set(current);
			if (next.has(type)) {
				next.delete(type);
			} else {
				next.add(type);
			}
			return next;
		});
	};

	return (
		<div className="h-full overflow-y-auto bg-background">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 md:px-8">
				<header className="flex max-w-3xl flex-col gap-2">
					<div className="flex items-center gap-2">
						<Sparkles aria-hidden="true" />
						<h1 className="text-2xl font-semibold tracking-tight">Advanced search</h1>
					</div>
					<p className="text-sm leading-6 text-muted-foreground">
						Find evidence across summaries, skills, projects, work history,
						volunteering, facts, bullets, concepts, and professional statements. Try
						“DevOps,” “incident response,” or “platform reliability.”
					</p>
				</header>

				<Card>
					<CardHeader className="gap-4">
						<div>
							<CardTitle>Search your experience</CardTitle>
							<CardDescription>
								Keyword finds exact words. Vector finds related meaning even when
								the wording differs.
							</CardDescription>
						</div>
						<Tabs
							value={mode}
							onValueChange={(value) => setMode(value as AdvancedSearchMode)}
						>
							<TabsList>
								<TabsTrigger value="keyword">Keyword</TabsTrigger>
								<TabsTrigger value="vector">Vector</TabsTrigger>
							</TabsList>
						</Tabs>
					</CardHeader>
					<CardContent>
						<form onSubmit={submit}>
							<InputGroup className="h-12">
								<InputGroupAddon>
									<Search />
								</InputGroupAddon>
								<InputGroupInput
									value={query}
									onChange={(event) => setQuery(event.target.value)}
									placeholder={
										mode === 'vector'
											? 'Describe the kind of experience you need…'
											: 'Search for a skill, technology, or phrase…'
									}
									aria-label="Search profile evidence"
								/>
								<InputGroupAddon align="inline-end">
									<InputGroupButton
										type="submit"
										variant="default"
										size="sm"
										disabled={query.trim().length < 2 || loading}
									>
										{loading ? <Spinner data-icon="inline-start" /> : null}
										Search
									</InputGroupButton>
								</InputGroupAddon>
							</InputGroup>
						</form>
					</CardContent>
				</Card>

				<section className="flex flex-col gap-4" aria-labelledby="search-results">
					{searchError ? (
						<Alert variant="destructive">
							<AlertDescription>
								Vector search could not complete. Check the embedding service and
								try again, or switch to keyword search.
							</AlertDescription>
						</Alert>
					) : null}
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="flex items-center gap-2">
							<h2 id="search-results" className="text-lg font-semibold">
								Results
							</h2>
							<Badge variant="secondary">{resultCount}</Badge>
						</div>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline">
									<Filter data-icon="inline-start" />
									Result types
									<Badge variant="secondary">
										{selectedTypes.size}/{RESULT_TYPES.length}
									</Badge>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-56">
								<DropdownMenuLabel>Return results for</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuGroup>
									{RESULT_TYPES.map((type) => (
										<DropdownMenuCheckboxItem
											key={type}
											checked={selectedTypes.has(type)}
											onCheckedChange={() => toggleResultType(type)}
											onSelect={(event) => event.preventDefault()}
										>
											{RESULT_TYPE_LABELS[type]}
										</DropdownMenuCheckboxItem>
									))}
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuGroup>
									<DropdownMenuItem
										onSelect={() => setSelectedTypes(new Set(RESULT_TYPES))}
									>
										Select all
									</DropdownMenuItem>
									<DropdownMenuItem onSelect={() => setSelectedTypes(new Set())}>
										Clear all
									</DropdownMenuItem>
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>

					{selectedTypes.size === 0 ? (
						<Alert>
							<AlertDescription>
								Select at least one result type to return search results.
							</AlertDescription>
						</Alert>
					) : !searched ? (
						<Alert>
							<AlertDescription>
								Enter at least two characters to search your selected result types.
							</AlertDescription>
						</Alert>
					) : (
						<div className="flex flex-col gap-8">
							{resultGroups.map((group) => (
								<section key={group.type} className="flex flex-col gap-3">
									<div className="flex items-center gap-2">
										<h3 className="text-base font-semibold">
											{RESULT_TYPE_LABELS[group.type]}
										</h3>
										<Badge variant="outline">{group.results.length}</Badge>
									</div>
									<DataTable
										columns={columns}
										data={group.results}
										getRowId={(row) => row.id}
										initialPageSize={10}
										emptyMessage={
											loading
												? `Searching ${RESULT_TYPE_LABELS[group.type].toLocaleLowerCase()}…`
												: `No matching ${RESULT_TYPE_LABELS[group.type].toLocaleLowerCase()}.`
										}
									/>
								</section>
							))}
						</div>
					)}
				</section>
			</div>
		</div>
	);
});

const RESULT_TYPES: ResultType[] = [
	'Summary',
	'Skill',
	'Project',
	'Work history',
	'Volunteering',
	'Fact',
	'Bullet',
	'Concept',
	'Professional statement',
];

const RESULT_TYPE_LABELS: Record<ResultType, string> = {
	Summary: 'Resume summaries',
	Skill: 'Skills',
	Project: 'Projects',
	'Work history': 'Work history',
	Volunteering: 'Volunteering',
	Fact: 'Profile facts',
	Bullet: 'Bullets',
	Concept: 'Concepts',
	'Professional statement': 'Professional statements',
};

const RESULT_TYPE_API_VALUES: Record<ResultType, AdvancedSearchApiResultType> = {
	Summary: 'SUMMARY',
	Skill: 'SKILL',
	Project: 'PROJECT',
	'Work history': 'WORK_HISTORY',
	Volunteering: 'VOLUNTEERING',
	Fact: 'FACT',
	Bullet: 'BULLET',
	Concept: 'CONCEPT',
	'Professional statement': 'PROFESSIONAL_STATEMENT',
};

function useProfessionalStatements(
	array: Y.Array<Y.Map<unknown>> | null,
): ProfessionalStatementSearchRecord[] {
	const [, render] = useReducer((value: number) => value + 1, 0);

	useEffect(() => {
		if (!array) return;
		array.observeDeep(render);
		return () => array.unobserveDeep(render);
	}, [array]);

	return (array?.toArray() ?? []).map((statement, index) => ({
		id: yString(statement, 'id') || `statement-${index}`,
		label: yString(statement, 'label') || 'Untitled statement',
		text: yString(statement, 'text'),
	}));
}

function yString(value: Y.Map<unknown>, field: string): string {
	const stored = value.get(field);
	return typeof stored === 'string' ? stored : '';
}

function containsQuery(query: string, values: Array<string | undefined>): boolean {
	const normalized = query.trim().toLocaleLowerCase();
	return Boolean(
		normalized && values.some((value) => value?.toLocaleLowerCase().includes(normalized)),
	);
}

function professionalStatementResults(
	query: string,
	statements: ProfessionalStatementSearchRecord[],
	vectorMode = false,
): AdvancedSearchResult[] {
	return statements.flatMap((statement) =>
		containsQuery(query, [statement.label, statement.text])
			? [
					{
						id: `professional-statement:${statement.id}`,
						type: 'Professional statement' as const,
						title: statement.label,
						excerpt: statement.text || 'Empty professional statement',
						source: 'Profile statements',
						relevanceLabel: vectorMode ? 'Text match' : undefined,
						to: '/profile/statements' as const,
					},
				]
			: [],
	);
}

function buildKeywordResults(
	query: string,
	data: {
		bullets: Array<{
			id: string;
			text: string;
			sourceType: BulletSourceType;
			sourceId: string;
		}>;
		concepts: ConceptUsage[];
		facts: Array<{
			id: string;
			what: string;
			impact?: string;
			scale?: string;
		}>;
		jobs: Array<{
			_id: string;
			company: string;
			position: string;
			responsibilities: string[];
		}>;
		projects: Array<{
			_id: string;
			name: string;
			description: string;
			technologies: string[];
			items: string[];
		}>;
		professionalStatements: ProfessionalStatementSearchRecord[];
		resumes: Resume[];
		skills: Array<{ _id: string; name: string; category: string }>;
		volunteering: Array<{
			_id: string;
			organization?: string;
			position: string;
			responsibilities: string[];
		}>;
	},
): AdvancedSearchResult[] {
	if (query.trim().length < 2) return [];
	const sources = {
		jobs: data.jobs,
		projects: data.projects,
		volunteering: data.volunteering,
	};

	return [
		...data.resumes.flatMap((resume) => {
			const summary = resume.data?.summary;
			if (!containsQuery(query, [resume.name, resume.company, summary])) return [];
			return [resumeResult(resume, summary || 'No resume summary available.')];
		}),
		...data.skills.flatMap((skill) =>
			containsQuery(query, [skill.name, skill.category])
				? [
						{
							id: `skill:${skill._id}`,
							type: 'Skill' as const,
							title: skill.name,
							excerpt: skill.category || 'Uncategorized skill',
							source: 'Profile skills',
							to: '/profile/skills' as const,
						},
					]
				: [],
		),
		...data.bullets.flatMap((bullet) => {
			if (!containsQuery(query, [bullet.text])) return [];
			const source = sourcePresentation(bullet.sourceType, bullet.sourceId, sources);
			return [
				{
					id: `source-bullet:${bullet.id}`,
					type: source.type,
					title: source.label,
					excerpt: bullet.text,
					source: source.source,
					to: bulletSourceRoute(bullet.sourceType),
					search: { bulletId: bullet.id },
				},
				bulletResult(bullet, source),
			];
		}),
		...data.concepts.flatMap(({ concept, bullets }) =>
			containsQuery(query, [
				concept.label,
				concept.key,
				concept.vocabulary,
				concept.definition,
			])
				? [
						{
							id: `concept:${concept.id}`,
							type: 'Concept' as const,
							title: concept.label,
							excerpt:
								concept.definition ||
								`${concept.vocabulary} · ${bullets.length} supporting ${bullets.length === 1 ? 'bullet' : 'bullets'}`,
							source: 'Profile concepts',
							to: '/profile/concepts' as const,
						},
					]
				: [],
		),
		...professionalStatementResults(query, data.professionalStatements),
		...data.projects.flatMap((project) =>
			containsQuery(query, [
				project.name,
				project.description,
				...project.technologies,
				...project.items,
			])
				? [
						{
							id: `project:${project._id}`,
							type: 'Project' as const,
							title: project.name,
							excerpt:
								project.description ||
								project.technologies.join(', ') ||
								project.items.join(' '),
							source: 'Profile projects',
							to: '/profile/projects' as const,
						},
					]
				: [],
		),
		...data.jobs.flatMap((job) =>
			containsQuery(query, [job.position, job.company, ...job.responsibilities])
				? [
						{
							id: `job:${job._id}`,
							type: 'Work history' as const,
							title: `${job.position} at ${job.company}`,
							excerpt: job.responsibilities.join(' '),
							source: 'Profile work history',
							to: '/profile/work-history' as const,
						},
					]
				: [],
		),
		...data.volunteering.flatMap((item) =>
			containsQuery(query, [item.position, item.organization, ...item.responsibilities])
				? [
						{
							id: `volunteering:${item._id}`,
							type: 'Volunteering' as const,
							title: [item.position, item.organization].filter(Boolean).join(' at '),
							excerpt: item.responsibilities.join(' '),
							source: 'Profile volunteering',
							to: '/profile/volunteering' as const,
						},
					]
				: [],
		),
		...data.facts.flatMap((fact) =>
			containsQuery(query, [fact.what, fact.impact, fact.scale])
				? [
						{
							id: `fact:${fact.id}`,
							type: 'Fact' as const,
							title: fact.what,
							excerpt: [fact.impact, fact.scale].filter(Boolean).join(' · '),
							source: 'Profile facts',
							to: '/profile/facts' as const,
						},
					]
				: [],
		),
	];
}

function buildVectorResults(data: {
	bullets: AdvancedSearchData['advancedSearch']['bullets'];
	concepts: ConceptSearchResult[];
	facts: Array<{
		id: string;
		what: string;
		impact?: string;
		concepts: Array<{ conceptId: string }>;
	}>;
	projects: Array<{ _id: string; name: string; technologies: string[] }>;
	professionalStatements: ProfessionalStatementSearchRecord[];
	query: string;
	resumes: ResumeSearchRecord[];
	skills: Array<{ _id: string; name: string; category: string }>;
	sources: {
		jobs: Array<{ _id: string; company: string; position: string }>;
		projects: Array<{ _id: string; name: string }>;
		volunteering: Array<{
			_id: string;
			organization?: string;
			position: string;
		}>;
	};
}): AdvancedSearchResult[] {
	const results: AdvancedSearchResult[] = [
		...data.resumes.map((resume) => semanticResumeResult(resume)),
		...data.bullets.flatMap(({ bullet: rawBullet, score }) => {
			const bullet = bulletFromGraphql(rawBullet);
			const source = sourcePresentation(bullet.sourceType, bullet.sourceId, data.sources);
			return [
				{
					id: `source-bullet:${bullet.id}`,
					type: source.type,
					title: source.label,
					excerpt: bullet.text,
					source: source.source,
					score,
					to: bulletSourceRoute(bullet.sourceType),
					search: { bulletId: bullet.id },
				},
				bulletResult(bullet, source, score),
			];
		}),
		...data.concepts.map(({ concept, score }) => ({
			id: `concept:${concept.id}`,
			type: 'Concept' as const,
			title: concept.label,
			excerpt: concept.definition || `${concept.vocabulary} · ${concept.key}`,
			source: 'Profile concepts',
			score,
			to: '/profile/concepts' as const,
		})),
		...professionalStatementResults(data.query, data.professionalStatements, true),
	];

	const conceptScores = new Map(
		data.concepts.flatMap(({ concept, score }) => [
			[normalize(concept.label), score],
			[normalize(concept.key), score],
		]),
	);
	const conceptScoresById = new Map(
		data.concepts.map(({ concept, score }) => [concept.id, score]),
	);
	for (const fact of data.facts) {
		const scores = fact.concepts.flatMap(({ conceptId }) => {
			const score = conceptScoresById.get(conceptId);
			return score === undefined ? [] : [score];
		});
		if (!scores.length) continue;
		results.push({
			id: `fact:${fact.id}`,
			type: 'Fact',
			title: fact.what,
			excerpt: fact.impact || 'Semantically related profile fact',
			source: 'Profile facts',
			score: Math.max(...scores),
			to: '/profile/facts',
		});
	}
	for (const skill of data.skills) {
		const score = conceptScores.get(normalize(skill.name));
		if (score === undefined) continue;
		results.push({
			id: `skill:${skill._id}`,
			type: 'Skill',
			title: skill.name,
			excerpt: skill.category || 'Semantically related skill',
			source: 'Profile skills',
			score,
			to: '/profile/skills',
		});
	}
	for (const project of data.projects) {
		const scores = project.technologies.flatMap((technology) => {
			const score = conceptScores.get(normalize(technology));
			return score === undefined ? [] : [score];
		});
		if (!scores.length) continue;
		results.push({
			id: `project-concept:${project._id}`,
			type: 'Project',
			title: project.name,
			excerpt: project.technologies.join(', '),
			source: 'Profile projects',
			score: Math.max(...scores),
			to: '/profile/projects',
		});
	}

	return [...new Map(results.map((result) => [result.id, result])).values()].sort(
		(left, right) => (right.score ?? 0) - (left.score ?? 0),
	);
}

function resumeResult(resume: Resume, excerpt: string): AdvancedSearchResult {
	return {
		id: `resume:${resume._id}`,
		type: 'Summary',
		title: resume.name || 'Untitled resume',
		excerpt,
		source: resume.company || (resume.base ? 'Base resume' : 'Resume'),
		to: resume.applicationId ? '/editor/$applicationId' : '/editor/resume/$resumeId',
		params: resume.applicationId
			? { applicationId: resume.applicationId }
			: { resumeId: resume._id },
		search: resume.applicationId ? { resumeId: resume._id } : undefined,
	};
}

function semanticResumeResult(resume: ResumeSearchRecord): AdvancedSearchResult {
	return {
		id: `resume:${resume.resumeId}`,
		type: 'Summary',
		title: resume.name || 'Untitled resume',
		excerpt:
			resume.summary?.summaryTheme ||
			resume.summary?.dominantTheme ||
			'Semantically similar resume summary',
		source: resume.company || (resume.base ? 'Base resume' : 'Resume'),
		score: Math.min(1, Math.max(0, resume.score * 60)),
		relevanceLabel: 'Vector match',
		to: resume.applicationId ? '/editor/$applicationId' : '/editor/resume/$resumeId',
		params: resume.applicationId
			? { applicationId: resume.applicationId }
			: { resumeId: resume.resumeId },
		search: resume.applicationId ? { resumeId: resume.resumeId } : undefined,
	};
}

function bulletResult(
	bullet: {
		id: string;
		text: string;
		sourceType: BulletSourceType;
	},
	source: { label: string; source: string },
	score?: number,
): AdvancedSearchResult {
	return {
		id: `bullet:${bullet.id}`,
		type: 'Bullet',
		title: source.label,
		excerpt: bullet.text,
		source: source.source,
		score,
		to: bulletSourceRoute(bullet.sourceType),
		search: { bulletId: bullet.id },
	};
}

function sourcePresentation(
	type: BulletSourceType,
	id: string,
	sources: {
		jobs: Array<{ _id: string; company: string; position: string }>;
		projects: Array<{ _id: string; name: string }>;
		volunteering: Array<{
			_id: string;
			organization?: string;
			position: string;
		}>;
	},
): { type: ResultType; label: string; source: string } {
	if (type === BulletSourceType.JOB) {
		const job = sources.jobs.find((item) => item._id === id);
		return {
			type: 'Work history',
			label: job ? `${job.position} at ${job.company}` : 'Work responsibility',
			source: 'Profile work history',
		};
	}
	if (type === BulletSourceType.PROJECT) {
		const project = sources.projects.find((item) => item._id === id);
		return {
			type: 'Project',
			label: project?.name || 'Project evidence',
			source: 'Profile projects',
		};
	}
	const volunteering = sources.volunteering.find((item) => item._id === id);
	return {
		type: 'Volunteering',
		label:
			[volunteering?.position, volunteering?.organization].filter(Boolean).join(' at ') ||
			'Volunteer responsibility',
		source: 'Profile volunteering',
	};
}

function normalize(value: string): string {
	return value
		.trim()
		.toLocaleLowerCase()
		.replaceAll(/[^a-z0-9]+/g, '-');
}
