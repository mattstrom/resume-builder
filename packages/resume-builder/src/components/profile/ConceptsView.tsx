import { useQuery } from '@apollo/client/react';
import { Link } from '@tanstack/react-router';
import { Pencil } from 'lucide-react';
import { observer } from 'mobx-react';
import { type FC, Fragment, useEffect, useMemo, useState } from 'react';

import { DataSourceControls } from '@/components/common/DataSourceControls.tsx';
import { DataSourceView } from '@/components/common/DataSourceView.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import { SEARCH_CONCEPTS } from '@/graphql/queries.ts';
import { useDataSourceController } from '@/hooks/use-data-source-controller.ts';
import { bulletSourceRoute } from '@/lib/bullet-deep-link.ts';
import {
	buildConceptIndex,
	filterConceptIndex,
	mergeConceptIndexResults,
	type ConceptUsage,
} from '@/lib/concept-index.ts';
import { conceptRelationPresentation } from '@/lib/semantic-concepts.ts';
import { cn } from '@/lib/utils.ts';
import { useStore } from '@/stores/store.provider.tsx';

const VOCABULARY_LABELS: Record<string, string> = {
	'fact-type': 'Fact types',
	entity: 'Entities',
	topic: 'Topics',
	technology: 'Technologies',
	capability: 'Capabilities',
	outcome: 'Outcomes',
	artifact: 'Artifacts',
};

const SOURCE_LABELS: Record<string, string> = {
	job: 'Work history',
	project: 'Project',
	volunteering: 'Volunteering',
};

function vocabularyLabel(vocabulary: string): string {
	return VOCABULARY_LABELS[vocabulary] ?? vocabulary;
}

interface ConceptCardProps {
	usage: ConceptUsage;
	semanticScore?: number;
	hideBulletText?: boolean;
}

const ConceptCard: FC<ConceptCardProps> = ({ usage, semanticScore, hideBulletText }) => (
	<Card>
		<CardHeader className="gap-2 p-4 pb-3">
			<div className="flex items-start justify-between gap-3">
				<div className="flex flex-col gap-1">
					<CardTitle className="text-base leading-5">{usage.concept.label}</CardTitle>
					<CardDescription className="font-mono text-xs">
						{usage.concept.key}
					</CardDescription>
				</div>
				<Badge variant="secondary">
					{usage.bullets.length} {usage.bullets.length === 1 ? 'bullet' : 'bullets'}
				</Badge>
			</div>
			{usage.concept.definition && (
				<CardDescription>{usage.concept.definition}</CardDescription>
			)}
			{semanticScore !== undefined && (
				<CardDescription>Similarity {semanticScore.toFixed(2)}</CardDescription>
			)}
		</CardHeader>
		<CardContent className="flex flex-col px-4 pb-4 pt-0">
			{usage.bullets.map(({ bullet, link }, index) => {
				const relation = conceptRelationPresentation(link.relation);

				return (
					<Fragment key={`${bullet.id}:${link.relation}`}>
						{index > 0 && <Separator className="my-3" />}
						<div className="flex flex-col gap-2">
							{!hideBulletText && (
								<p className="text-sm leading-6 text-foreground">{bullet.text}</p>
							)}
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div className="flex flex-wrap gap-1.5">
									<Badge variant={relation.variant}>{relation.label}</Badge>
									<Badge variant="outline">
										{SOURCE_LABELS[bullet.sourceType] ?? bullet.sourceType}
									</Badge>
									<Badge variant="outline">{bullet.status}</Badge>
								</div>
								<Button variant="link" size="sm" className="h-auto p-0" asChild>
									<Link
										to={bulletSourceRoute(bullet.sourceType)}
										search={{ bulletId: bullet.id }}
									>
										<Pencil data-icon="inline-start" />
										Edit bullet
									</Link>
								</Button>
							</div>
						</div>
					</Fragment>
				);
			})}
		</CardContent>
	</Card>
);

interface SearchConceptsData {
	searchConcepts: Array<{
		score: number;
		concept: { id: string };
	}>;
}

const ConceptsLoading: FC = () => (
	<div className="grid gap-4 lg:grid-cols-2">
		{Array.from({ length: 4 }, (_, index) => (
			<Card key={index}>
				<CardHeader className="flex flex-col gap-2 p-4">
					<Skeleton className="h-5 w-40" />
					<Skeleton className="h-3 w-24" />
				</CardHeader>
				<CardContent className="flex flex-col gap-2 px-4 pb-4">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-3/4" />
				</CardContent>
			</Card>
		))}
	</div>
);

export const ConceptsView: FC = observer(() => {
	const { bulletsStore } = useStore();
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [hideBulletText, setHideBulletText] = useState(false);
	const bullets = bulletsStore.bullets;
	const allUsages = useMemo(() => buildConceptIndex(bullets), [bullets]);

	const controller = useDataSourceController<ConceptUsage>({
		getId: (usage) => usage.concept.id,
		groupings: [
			{
				key: 'vocabulary',
				label: 'Vocabulary',
				groupOf: (usage) => usage.concept.vocabulary,
				groupLabel: vocabularyLabel,
			},
		],
		defaultGroupingKey: 'vocabulary',
	});

	const textUsages = useMemo(
		() => filterConceptIndex(allUsages, controller.searchQuery),
		[allUsages, controller.searchQuery],
	);

	useEffect(() => {
		const timeout = window.setTimeout(
			() => setDebouncedSearch(controller.searchQuery.trim()),
			250,
		);

		return () => window.clearTimeout(timeout);
	}, [controller.searchQuery]);

	const semanticSearchEnabled = debouncedSearch.length >= 2;
	const {
		data: semanticData,
		loading: semanticLoading,
		error: semanticError,
	} = useQuery<SearchConceptsData>(SEARCH_CONCEPTS, {
		variables: {
			query: debouncedSearch,
			limit: 10,
			minimumScore: 0.55,
		},
		skip: !semanticSearchEnabled,
		fetchPolicy: 'network-only',
	});
	const hasCurrentSemanticResults =
		semanticSearchEnabled && controller.searchQuery.trim() === debouncedSearch && semanticData;
	const usages = useMemo(
		() =>
			hasCurrentSemanticResults
				? mergeConceptIndexResults(
						allUsages,
						semanticData.searchConcepts.map(({ concept }) => concept.id),
						textUsages,
					)
				: textUsages,
		[allUsages, hasCurrentSemanticResults, semanticData, textUsages],
	);
	const semanticScores = useMemo(
		() =>
			new Map(
				hasCurrentSemanticResults
					? semanticData.searchConcepts.map(({ concept, score }) => [concept.id, score])
					: [],
			),
		[hasCurrentSemanticResults, semanticData],
	);
	controller.setItems(usages);
	const mappedBulletCount = new Set(
		allUsages.flatMap((usage) => usage.bullets.map(({ bullet }) => bullet.id)),
	).size;

	return (
		<div className="flex h-full w-full flex-col gap-6 overflow-y-auto p-6">
			<div className="flex flex-col gap-2">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h1 className="text-2xl font-semibold text-foreground">Concepts</h1>
						<p className="text-sm text-muted-foreground">
							See the bullet evidence behind each technology, capability, and outcome.
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<Badge variant="secondary">{allUsages.length} concepts</Badge>
						<Badge variant="outline">{mappedBulletCount} mapped bullets</Badge>
						<div className="flex items-center gap-2">
							<Label htmlFor="hide-bullet-text">Hide bullet text</Label>
							<Switch
								id="hide-bullet-text"
								checked={hideBulletText}
								onCheckedChange={setHideBulletText}
							/>
						</div>
					</div>
				</div>
			</div>

			<DataSourceControls
				controller={controller}
				showSearch
				searchAriaLabel="Search concepts and supporting bullets"
				searchPlaceholder="Search concepts or bullet text"
				groupingAriaLabel="Group by"
			/>
			{semanticLoading && controller.searchQuery.trim() === debouncedSearch && (
				<p className="text-xs text-muted-foreground">Finding semantic matches…</p>
			)}
			{semanticError && (
				<p className="text-xs text-muted-foreground">
					Semantic matching is unavailable; showing text matches.
				</p>
			)}

			{bulletsStore.loading ? (
				<ConceptsLoading />
			) : (
				<DataSourceView
					controller={controller}
					emptyState={
						<Card className="max-w-2xl">
							<CardHeader>
								<CardTitle className="text-base">
									{allUsages.length === 0
										? 'No concepts mapped yet'
										: 'No matches'}
								</CardTitle>
								<CardDescription>
									{allUsages.length === 0
										? 'Add or analyze concepts on your work, project, and volunteering bullets.'
										: 'Try a concept name, relationship, source type, status, or phrase from a bullet.'}
								</CardDescription>
							</CardHeader>
						</Card>
					}
					itemsClassName={cn(
						'grid items-start gap-4',
						hideBulletText ? 'lg:grid-cols-3 xl:grid-cols-4' : 'lg:grid-cols-2',
					)}
					renderGroupHeader={(group) => (
						<div className="flex items-center gap-2">
							<h2 className="text-base font-semibold capitalize text-foreground">
								{group.label}
							</h2>
							<Badge variant="outline">{group.items.length}</Badge>
						</div>
					)}
					renderItem={({ item }) => (
						<ConceptCard
							usage={item}
							semanticScore={semanticScores.get(item.concept.id)}
							hideBulletText={hideBulletText}
						/>
					)}
				/>
			)}
		</div>
	);
});
