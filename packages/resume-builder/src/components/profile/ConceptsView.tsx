import { Link } from '@tanstack/react-router';
import { Pencil, Search } from 'lucide-react';
import { observer } from 'mobx-react';
import { type FC, Fragment, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card.tsx';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { bulletSourceRoute } from '@/lib/bullet-deep-link.ts';
import { buildConceptIndex, filterConceptIndex, type ConceptUsage } from '@/lib/concept-index.ts';
import { conceptRelationPresentation } from '@/lib/semantic-concepts.ts';
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
}

const ConceptCard: FC<ConceptCardProps> = ({ usage }) => (
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
		</CardHeader>
		<CardContent className="flex flex-col px-4 pb-4 pt-0">
			{usage.bullets.map(({ bullet, link }, index) => {
				const relation = conceptRelationPresentation(link.relation);
				return (
					<Fragment key={`${bullet.id}:${link.relation}`}>
						{index > 0 && <Separator className="my-3" />}
						<div className="flex flex-col gap-2">
							<p className="text-sm leading-6 text-foreground">{bullet.text}</p>
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
	const [search, setSearch] = useState('');
	const bullets = bulletsStore.bullets;
	const allUsages = useMemo(() => buildConceptIndex(bullets), [bullets]);
	const usages = useMemo(() => filterConceptIndex(allUsages, search), [allUsages, search]);
	const grouped = useMemo(
		() =>
			Object.entries(Object.groupBy(usages, ({ concept }) => concept.vocabulary)).sort(
				([left], [right]) => vocabularyLabel(left).localeCompare(vocabularyLabel(right)),
			),
		[usages],
	);
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
					<div className="flex flex-wrap gap-2">
						<Badge variant="secondary">{allUsages.length} concepts</Badge>
						<Badge variant="outline">{mappedBulletCount} mapped bullets</Badge>
					</div>
				</div>
			</div>

			<InputGroup className="max-w-2xl">
				<InputGroupAddon>
					<Search />
				</InputGroupAddon>
				<InputGroupInput
					aria-label="Search concepts and supporting bullets"
					placeholder="Search concepts or bullet text"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
				/>
			</InputGroup>

			{bulletsStore.loading ? (
				<ConceptsLoading />
			) : grouped.length === 0 ? (
				<Card className="max-w-2xl">
					<CardHeader>
						<CardTitle className="text-base">
							{allUsages.length === 0 ? 'No concepts mapped yet' : 'No matches'}
						</CardTitle>
						<CardDescription>
							{allUsages.length === 0
								? 'Add or analyze concepts on your work, project, and volunteering bullets.'
								: 'Try a concept name, relationship, source type, status, or phrase from a bullet.'}
						</CardDescription>
					</CardHeader>
				</Card>
			) : (
				<div className="flex flex-col gap-8">
					{grouped.map(([vocabulary, vocabularyUsages]) => (
						<section key={vocabulary} className="flex flex-col gap-3">
							<div className="flex items-center gap-2">
								<h2 className="text-base font-semibold capitalize text-foreground">
									{vocabularyLabel(vocabulary)}
								</h2>
								<Badge variant="outline">{vocabularyUsages?.length ?? 0}</Badge>
							</div>
							<div className="grid items-start gap-4 lg:grid-cols-2">
								{vocabularyUsages?.map((usage) => (
									<ConceptCard key={usage.concept.id} usage={usage} />
								))}
							</div>
						</section>
					))}
				</div>
			)}
		</div>
	);
});
