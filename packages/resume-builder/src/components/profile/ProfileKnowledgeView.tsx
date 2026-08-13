import { useQuery } from '@apollo/client/react';
import { profileKnowledgeProposalSchema } from '@resume-builder/entities';
import { Link } from '@tanstack/react-router';
import {
	ArrowRight,
	BookOpen,
	CheckCircle2,
	ExternalLink,
	Inbox,
	Network,
	Search,
} from 'lucide-react';
import { observer } from 'mobx-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';
import { Badge, type BadgeProps } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { GET_PROFILE_KNOWLEDGE_LEDGER } from '@/graphql/queries.ts';
import type { GetProfileKnowledgeLedgerData, ProfileKnowledgeInboxItem } from '@/graphql/types.ts';
import { bulletSourceRoute } from '@/lib/bullet-deep-link.ts';
import { conceptRelationPresentation } from '@/lib/semantic-concepts.ts';
import type { Fact } from '@/stores/facts.store.ts';
import { useStore } from '@/stores/store.provider.tsx';

type KnowledgeType = 'fact' | 'guidance' | 'relationship';
type KnowledgeState = 'confirmed' | 'accepted' | 'inferred';

interface LedgerLink {
	label: string;
	to:
		| '/profile'
		| '/profile/facts'
		| '/profile/work-history'
		| '/profile/projects'
		| '/profile/volunteering'
		| '/applications/$applicationId';
	params?: { applicationId: string };
	search?: { bulletId?: string; stage?: 'requirements' };
}

interface LedgerEntry {
	id: string;
	type: KnowledgeType;
	state: KnowledgeState;
	title: string;
	description: string;
	sourceKey: string;
	sourceLabel: string;
	createdAt?: string | Date;
	details?: ReactNode;
	link: LedgerLink;
	externalUri?: string;
}

const TYPE_LABELS: Record<KnowledgeType, string> = {
	fact: 'Confirmed facts',
	guidance: 'Accepted guidance',
	relationship: 'Concept relationships',
};

const STATE_PRESENTATION: Record<
	KnowledgeState,
	{ label: string; variant: BadgeProps['variant'] }
> = {
	confirmed: { label: 'Confirmed knowledge', variant: 'success' },
	accepted: { label: 'Accepted guidance', variant: 'info' },
	inferred: { label: 'Inferred relationship', variant: 'warning' },
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	dateStyle: 'medium',
	timeStyle: 'short',
});

function sourceDetails(source: string) {
	const normalized = source.trim().toLocaleLowerCase();
	if (normalized === 'user-feedback') {
		return { key: 'feedback', label: 'Grade feedback' };
	}
	if (normalized === 'user') return { key: 'user', label: 'User-confirmed' };
	if (normalized === 'ontology') return { key: 'ontology', label: 'Ontology' };
	if (
		normalized.includes('classifier') ||
		normalized.includes('extract') ||
		normalized.includes('agent') ||
		normalized.includes('workflow') ||
		normalized.includes('generated')
	) {
		return { key: 'system', label: 'System analysis' };
	}
	return { key: normalized || 'profile', label: source || 'Profile record' };
}

function gradeLabel(grade?: string | null) {
	return grade ? grade.charAt(0).toUpperCase() + grade.slice(1) : 'Not graded';
}

function acceptedFactDetails(item: ProfileKnowledgeInboxItem) {
	return (
		<div className="flex flex-col gap-3">
			<p className="text-sm text-muted-foreground">{item.proposal.rationale}</p>
			<Separator />
			<div className="flex flex-col gap-1">
				<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
					Originating requirement
				</p>
				<p className="text-sm">{item.requirement}</p>
			</div>
			{item.explanation && (
				<p className="text-sm text-muted-foreground">Your feedback: {item.explanation}</p>
			)}
		</div>
	);
}

function factEntry(fact: Fact, acceptedProvenance?: ProfileKnowledgeInboxItem): LedgerEntry {
	const source = acceptedProvenance
		? { key: 'feedback', label: 'Grade feedback' }
		: fact.citation
			? { key: 'narrative', label: 'Narrative' }
			: { key: 'profile', label: 'Profile fact record' };

	return {
		id: `fact:${fact.id}`,
		type: 'fact',
		state: 'confirmed',
		title: fact.what,
		description:
			[fact.impact, fact.scale].filter(Boolean).join(' · ') || 'Durable profile fact',
		sourceKey: source.key,
		sourceLabel: source.label,
		createdAt: fact.createdAt,
		details: acceptedProvenance ? (
			acceptedFactDetails(acceptedProvenance)
		) : fact.citation ? (
			<blockquote className="border-l-2 border-border pl-3 text-sm italic text-muted-foreground">
				“{fact.citation}”
			</blockquote>
		) : undefined,
		link: acceptedProvenance
			? {
					label: 'View originating application',
					to: '/applications/$applicationId',
					params: { applicationId: acceptedProvenance.applicationId },
					search: { stage: 'requirements' },
				}
			: fact.citation
				? { label: 'View narrative', to: '/profile' }
				: { label: 'View fact record', to: '/profile/facts' },
	};
}

function guidanceEntry(item: ProfileKnowledgeInboxItem): LedgerEntry | undefined {
	const parsed = profileKnowledgeProposalSchema.safeParse(item.proposal.payload);
	if (!parsed.success || parsed.data.kind === 'fact' || !parsed.data.guidance) return;

	return {
		id: `guidance:${item.proposal.id}`,
		type: 'guidance',
		state: 'accepted',
		title: item.proposal.title,
		description: parsed.data.guidance,
		sourceKey: 'feedback',
		sourceLabel: 'Grade feedback',
		createdAt: item.proposal.resolvedAt ?? item.proposal.createdAt,
		details: (
			<div className="flex flex-col gap-3">
				<p className="text-sm text-muted-foreground">{item.proposal.rationale}</p>
				<Separator />
				<div className="flex flex-col gap-1">
					<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Grade feedback
					</p>
					<p className="text-sm">{item.requirement}</p>
					<div className="flex flex-wrap items-center gap-2 pt-1">
						<Badge variant="outline">Agent: {gradeLabel(item.agentGrade)}</Badge>
						<ArrowRight aria-hidden="true" />
						<Badge variant="outline">You: {gradeLabel(item.manualGrade)}</Badge>
					</div>
				</div>
				{item.explanation && (
					<p className="text-sm text-muted-foreground">“{item.explanation}”</p>
				)}
			</div>
		),
		link: {
			label: 'View originating application',
			to: '/applications/$applicationId',
			params: { applicationId: item.applicationId },
			search: { stage: 'requirements' },
		},
	};
}

function factRelationshipEntries(fact: Fact): LedgerEntry[] {
	return fact.concepts.map((assertion) => {
		const source = sourceDetails(assertion.source);
		const relation = conceptRelationPresentation(assertion.relation);
		return {
			id: `fact-concept:${fact.id}:${assertion.conceptId}:${assertion.relation}`,
			type: 'relationship',
			state:
				assertion.source === 'user' || assertion.source === 'user-feedback'
					? 'confirmed'
					: 'inferred',
			title: assertion.concept.label,
			description: `${fact.what} — ${relation.label.toLocaleLowerCase()} ${assertion.concept.label}`,
			sourceKey: source.key,
			sourceLabel: source.label,
			createdAt: fact.createdAt,
			details: (
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant={relation.variant}>{relation.label}</Badge>
					<Badge variant="outline">{assertion.concept.vocabulary}</Badge>
					{assertion.confidence !== undefined && assertion.confidence !== null && (
						<span className="text-xs text-muted-foreground">
							{Math.round(assertion.confidence * 100)}% confidence
						</span>
					)}
				</div>
			),
			link: { label: 'View related fact', to: '/profile/facts' },
			externalUri: assertion.concept.externalUri,
		};
	});
}

function KnowledgeCard({ entry }: { entry: LedgerEntry }) {
	const state = STATE_PRESENTATION[entry.state];
	return (
		<Card>
			<CardHeader className="gap-3">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="flex min-w-0 flex-col gap-2">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant={state.variant}>{state.label}</Badge>
							<Badge variant="outline">{entry.sourceLabel}</Badge>
						</div>
						<CardTitle className="text-base leading-6">{entry.title}</CardTitle>
					</div>
					{entry.createdAt && (
						<span className="text-xs text-muted-foreground">
							{dateFormatter.format(new Date(entry.createdAt))}
						</span>
					)}
				</div>
				<CardDescription className="leading-6">{entry.description}</CardDescription>
			</CardHeader>
			{entry.details && <CardContent>{entry.details}</CardContent>}
			<CardFooter className="flex flex-wrap justify-between gap-2">
				<Button variant="link" size="sm" className="h-auto p-0" asChild>
					<Link to={entry.link.to} params={entry.link.params} search={entry.link.search}>
						{entry.link.label}
						<ArrowRight data-icon="inline-end" />
					</Link>
				</Button>
				{entry.externalUri && (
					<Button variant="ghost" size="sm" asChild>
						<a href={entry.externalUri} target="_blank" rel="noreferrer">
							Concept reference
							<ExternalLink data-icon="inline-end" />
						</a>
					</Button>
				)}
			</CardFooter>
		</Card>
	);
}

function LedgerLoading() {
	return (
		<div className="grid items-start gap-4 lg:grid-cols-2">
			{Array.from({ length: 4 }, (_, index) => (
				<Card key={index}>
					<CardHeader className="flex flex-col gap-3">
						<Skeleton className="h-5 w-32" />
						<Skeleton className="h-5 w-3/4" />
						<Skeleton className="h-4 w-full" />
					</CardHeader>
				</Card>
			))}
		</div>
	);
}

export const ProfileKnowledgeView = observer(() => {
	const { factsStore, bulletsStore } = useStore();
	const [typeFilter, setTypeFilter] = useState<KnowledgeType | 'all'>('all');
	const [sourceFilter, setSourceFilter] = useState('all');
	const [searchQuery, setSearchQuery] = useState('');
	const { data, loading, error } = useQuery<GetProfileKnowledgeLedgerData>(
		GET_PROFILE_KNOWLEDGE_LEDGER,
		{ fetchPolicy: 'cache-and-network' },
	);

	useEffect(() => {
		document.title = 'Profile knowledge - Resume Builder';
		return () => {
			document.title = 'Resume Builder';
		};
	}, []);

	const accepted = data?.profileKnowledgeLedger.accepted ?? [];
	const acceptedFactById = useMemo(
		() =>
			new Map(
				accepted.flatMap((item) =>
					item.proposal.acceptedFactId
						? [[item.proposal.acceptedFactId, item] as const]
						: [],
				),
			),
		[accepted],
	);
	const entries = useMemo<LedgerEntry[]>(() => {
		const facts = factsStore.facts.flatMap((fact) => [
			factEntry(fact, acceptedFactById.get(fact.id)),
			...factRelationshipEntries(fact),
		]);
		const guidance = accepted.flatMap((item) => {
			const entry = guidanceEntry(item);
			return entry ? [entry] : [];
		});
		const bulletRelationships = bulletsStore.bullets.flatMap((bullet) =>
			bullet.concepts.map((assertion) => {
				const source = sourceDetails(assertion.source);
				const relation = conceptRelationPresentation(assertion.relation);
				return {
					id: `bullet-concept:${bullet.id}:${assertion.conceptId}:${assertion.relation}`,
					type: 'relationship' as const,
					state:
						assertion.source === 'user'
							? ('confirmed' as const)
							: ('inferred' as const),
					title: assertion.concept.label,
					description: `${bullet.text} — ${relation.label.toLocaleLowerCase()} ${assertion.concept.label}`,
					sourceKey: source.key,
					sourceLabel: source.label,
					createdAt: bullet.createdAt,
					details: (
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant={relation.variant}>{relation.label}</Badge>
							<Badge variant="outline">{bullet.sourceType}</Badge>
							<Badge variant="outline">{bullet.status}</Badge>
							{assertion.confidence !== undefined &&
								assertion.confidence !== null && (
									<span className="text-xs text-muted-foreground">
										{Math.round(assertion.confidence * 100)}% confidence
									</span>
								)}
						</div>
					),
					link: {
						label: 'View originating profile record',
						to: bulletSourceRoute(bullet.sourceType),
						search: { bulletId: bullet.id },
					},
					externalUri: assertion.concept.externalUri,
				} satisfies LedgerEntry;
			}),
		);

		return [...facts, ...guidance, ...bulletRelationships].sort(
			(left, right) =>
				new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime(),
		);
	}, [accepted, acceptedFactById, bulletsStore.bullets, factsStore.facts]);

	const sources = useMemo(
		() =>
			[
				...new Map(entries.map((entry) => [entry.sourceKey, entry.sourceLabel])).entries(),
			].sort(([, left], [, right]) => left.localeCompare(right)),
		[entries],
	);
	const filteredEntries = useMemo(() => {
		const query = searchQuery.trim().toLocaleLowerCase();
		return entries.filter(
			(entry) =>
				(typeFilter === 'all' || entry.type === typeFilter) &&
				(sourceFilter === 'all' || entry.sourceKey === sourceFilter) &&
				(!query ||
					`${entry.title} ${entry.description} ${entry.sourceLabel}`
						.toLocaleLowerCase()
						.includes(query)),
		);
	}, [entries, searchQuery, sourceFilter, typeFilter]);
	const counts = useMemo(
		() => ({
			facts: entries.filter((entry) => entry.type === 'fact').length,
			guidance: entries.filter((entry) => entry.type === 'guidance').length,
			relationships: entries.filter((entry) => entry.type === 'relationship').length,
		}),
		[entries],
	);
	const isLoading = loading || factsStore.loading || bulletsStore.loading;
	const pendingCount = data?.profileKnowledgeLedger.pendingSuggestionCount ?? 0;

	return (
		<div className="h-full overflow-y-auto bg-background">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 md:px-8">
				<header className="flex flex-wrap items-end justify-between gap-4">
					<div className="flex max-w-3xl flex-col gap-2">
						<div className="flex items-center gap-2">
							<BookOpen aria-hidden="true" />
							<h1 className="text-2xl font-semibold tracking-tight">
								Profile knowledge
							</h1>
						</div>
						<p className="text-sm text-muted-foreground">
							An inspectable ledger of confirmed facts, accepted guidance, and the
							concept relationships the system actively uses. This view is read-only.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Badge variant="secondary">{counts.facts} facts</Badge>
						<Badge variant="secondary">{counts.guidance} guidance</Badge>
						<Badge variant="secondary">{counts.relationships} relationships</Badge>
					</div>
				</header>

				{pendingCount > 0 && (
					<Alert>
						<Inbox />
						<AlertTitle>
							{pendingCount} pending suggestion{pendingCount === 1 ? '' : 's'}
						</AlertTitle>
						<AlertDescription className="flex flex-wrap items-center justify-between gap-3">
							<span>
								Pending knowledge is not active and remains separate from this
								ledger.
							</span>
							<Button variant="outline" size="sm" asChild>
								<Link to="/feedback">
									Open Feedback inbox
									<ArrowRight data-icon="inline-end" />
								</Link>
							</Button>
						</AlertDescription>
					</Alert>
				)}

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Filter the ledger</CardTitle>
						<CardDescription>
							Narrow by knowledge type, provenance source, or matching text.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3 md:grid-cols-[1fr_14rem_14rem]">
						<div className="relative">
							<Search
								className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
								aria-hidden="true"
							/>
							<Input
								value={searchQuery}
								onChange={(event) => setSearchQuery(event.target.value)}
								placeholder="Search knowledge"
								aria-label="Search profile knowledge"
								className="pl-9"
							/>
						</div>
						<Select
							value={typeFilter}
							onValueChange={(value) => setTypeFilter(value as KnowledgeType | 'all')}
						>
							<SelectTrigger aria-label="Filter by knowledge type">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectItem value="all">All knowledge types</SelectItem>
									{Object.entries(TYPE_LABELS).map(([value, label]) => (
										<SelectItem key={value} value={value}>
											{label}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
						<Select value={sourceFilter} onValueChange={setSourceFilter}>
							<SelectTrigger aria-label="Filter by source">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectItem value="all">All sources</SelectItem>
									{sources.map(([value, label]) => (
										<SelectItem key={value} value={value}>
											{label}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</CardContent>
				</Card>

				{error && (
					<Alert variant="destructive">
						<AlertTitle>Accepted guidance could not be loaded</AlertTitle>
						<AlertDescription>{error.message}</AlertDescription>
					</Alert>
				)}

				{isLoading && entries.length === 0 ? (
					<LedgerLoading />
				) : filteredEntries.length === 0 ? (
					<Alert>
						<CheckCircle2 />
						<AlertTitle>
							{entries.length === 0
								? 'No active knowledge yet'
								: 'No matching knowledge'}
						</AlertTitle>
						<AlertDescription>
							{entries.length === 0
								? 'Confirmed facts, accepted guidance, and active concept relationships will appear here.'
								: 'Try changing the type, source, or search filters.'}
						</AlertDescription>
					</Alert>
				) : (
					<div className="flex flex-col gap-6">
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Network aria-hidden="true" />
							<span>{filteredEntries.length} ledger entries</span>
						</div>
						<div className="grid items-start gap-4 lg:grid-cols-2">
							{filteredEntries.map((entry) => (
								<KnowledgeCard key={entry.id} entry={entry} />
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
});
