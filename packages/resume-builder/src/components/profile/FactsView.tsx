import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { observer } from 'mobx-react';
import { type FC, type FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge, type BadgeProps } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Combobox } from '@/components/ui/combobox.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select.tsx';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import type { ConceptSuggestion, Fact, FactConcept } from '@/stores/facts.store.ts';
import { useStore } from '@/stores/store.provider.tsx';

const RELATIONS = [
	{
		value: 'is-a',
		label: 'Type',
		vocabulary: 'fact-type',
		variant: 'default',
	},
	{
		value: 'relates-to',
		label: 'Related to',
		vocabulary: 'entity',
		variant: 'outline',
	},
	{
		value: 'about',
		label: 'About',
		vocabulary: 'topic',
		variant: 'secondary',
	},
	{
		value: 'uses',
		label: 'Uses',
		vocabulary: 'technology',
		variant: 'relationUses',
	},
	{
		value: 'demonstrates',
		label: 'Demonstrates',
		vocabulary: 'capability',
		variant: 'relationDemonstrates',
	},
	{
		value: 'supports',
		label: 'Supports',
		vocabulary: 'capability',
		variant: 'relationSupports',
	},
	{
		value: 'produced',
		label: 'Produced',
		vocabulary: 'outcome',
		variant: 'relationProduced',
	},
] as const satisfies ReadonlyArray<{
	value: string;
	label: string;
	vocabulary: string;
	variant: BadgeProps['variant'];
}>;

type Relation = (typeof RELATIONS)[number]['value'];
type FactsGrouped = Record<string, Record<string, Record<string, Fact[]>>>;

function relationDetails(relation: string) {
	return RELATIONS.find((candidate) => candidate.value === relation);
}

function conceptKey(label: string): string {
	return label
		.trim()
		.toLocaleLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

function groupFacts(facts: Fact[]): FactsGrouped {
	const result: FactsGrouped = {};
	for (const fact of facts) {
		const typeConcept = fact.concepts.find(
			(link) => link.relation === 'is-a' && link.concept.vocabulary === 'fact-type',
		)?.concept;
		const entityConcept = fact.concepts.find(
			(link) => link.relation === 'relates-to' && link.concept.vocabulary === 'entity',
		)?.concept;
		const [entityType = '', ...entityIdParts] = entityConcept?.key.split(':') ?? [];
		const rawEntityId = entityIdParts.join(':');
		const normalizedEntityType = entityType === 'unknown' ? '' : entityType;
		const entityId = rawEntityId === '*' ? '' : rawEntityId;
		const kind = typeConcept?.label || typeConcept?.key || 'Unclassified';
		((result[normalizedEntityType] ??= {})[entityId] ??= {})[kind] ??= [];
		result[normalizedEntityType][entityId][kind].push(fact);
	}
	return result;
}

interface SemanticBadgeProps {
	link: FactConcept;
}

const SemanticBadge: FC<SemanticBadgeProps> = ({ link }) => {
	const details = relationDetails(link.relation);
	return (
		<Badge variant={details?.variant ?? 'outline'} className="font-normal">
			{details?.label ?? link.relation} · {link.concept.label}
		</Badge>
	);
};

interface FactCardProps {
	fact: Fact;
	onEdit: (factId: string) => void;
}

const FactCard: FC<FactCardProps> = ({ fact, onEdit }) => (
	<Card>
		<CardHeader className="p-4 pb-3">
			<CardTitle className="text-sm leading-5">{fact.what}</CardTitle>
		</CardHeader>

		{(fact.impact || fact.scale || fact.citation) && (
			<CardContent className="flex flex-col gap-2 px-4 pb-3">
				{fact.impact && (
					<p className="text-xs text-muted-foreground">
						<span className="font-medium text-foreground/70">Impact:</span>{' '}
						{fact.impact}
					</p>
				)}
				{fact.scale && (
					<p className="text-xs text-muted-foreground">
						<span className="font-medium text-foreground/70">Scale:</span> {fact.scale}
					</p>
				)}
				{fact.citation && (
					<blockquote className="border-l-2 border-border pl-3 text-xs italic text-muted-foreground/70">
						&ldquo;{fact.citation}&rdquo;
					</blockquote>
				)}
			</CardContent>
		)}

		<CardFooter className="flex flex-wrap justify-between gap-2 px-4 pb-4">
			<div className="flex flex-wrap gap-1.5">
				{fact.concepts.map((link) => (
					<SemanticBadge key={`${link.relation}:${link.conceptId}`} link={link} />
				))}
			</div>
			<Button variant="ghost" size="sm" onClick={() => onEdit(fact.id)}>
				<Pencil data-icon="inline-start" />
				Meaning
			</Button>
		</CardFooter>
	</Card>
);

interface KindGroupProps {
	kind: string;
	facts: Fact[];
	onEdit: (factId: string) => void;
}

const KindGroup: FC<KindGroupProps> = ({ kind, facts, onEdit }) => (
	<div className="flex flex-col gap-2">
		<h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
			{kind}
		</h3>
		{facts.map((fact) => (
			<FactCard key={fact.id} fact={fact} onEdit={onEdit} />
		))}
	</div>
);

interface EntityGroupProps {
	entityId: string;
	kindMap: Record<string, Fact[]>;
	onEdit: (factId: string) => void;
}

const EntityGroup: FC<EntityGroupProps> = ({ entityId, kindMap, onEdit }) => (
	<div className="flex flex-col gap-4 rounded-lg border border-border/50 p-4">
		{entityId && <p className="font-mono text-xs text-muted-foreground/70">{entityId}</p>}
		{Object.keys(kindMap).map((kind) => (
			<KindGroup key={kind} kind={kind} facts={kindMap[kind]} onEdit={onEdit} />
		))}
	</div>
);

interface EntityTypeGroupProps {
	entityType: string;
	entityMap: Record<string, Record<string, Fact[]>>;
	onEdit: (factId: string) => void;
}

const EntityTypeGroup: FC<EntityTypeGroupProps> = ({ entityType, entityMap, onEdit }) => (
	<section className="flex flex-col gap-3">
		<h2 className="text-base font-semibold capitalize text-foreground">
			{entityType || 'General'}
		</h2>
		{Object.keys(entityMap).map((entityId) => (
			<EntityGroup
				key={entityId}
				entityId={entityId}
				kindMap={entityMap[entityId]}
				onEdit={onEdit}
			/>
		))}
	</section>
);

interface MeaningEditorProps {
	fact?: Fact;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const MeaningEditor: FC<MeaningEditorProps> = observer(({ fact, open, onOpenChange }) => {
	const { factsStore } = useStore();
	const [relation, setRelation] = useState<Relation>('demonstrates');
	const [label, setLabel] = useState('');
	const [selectedSuggestion, setSelectedSuggestion] = useState<ConceptSuggestion>();
	const [suggestions, setSuggestions] = useState<ConceptSuggestion[]>([]);
	const [conceptOpen, setConceptOpen] = useState(false);
	const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
	const details = relationDetails(relation)!;
	const suggestionType =
		{
			technology: 'technologies',
			outcome: 'outcomes',
			capability: 'capabilities',
			'fact-type': 'fact types',
			entity: 'entities',
			topic: 'topics',
		}[details.vocabulary] ?? 'concepts';
	const comboboxOptions = suggestions.map((suggestion) => ({
		value: suggestion.key,
		label: suggestion.label,
		description: suggestion.definition ?? undefined,
	}));

	useEffect(() => {
		setLabel('');
		setSelectedSuggestion(undefined);
		setSuggestions([]);
	}, [relation]);

	useEffect(() => {
		if (!conceptOpen) {
			setIsLoadingSuggestions(false);
			return;
		}

		let active = true;
		setSuggestions([]);
		setIsLoadingSuggestions(true);
		const timer = window.setTimeout(async () => {
			try {
				const nextSuggestions = await factsStore.getConceptSuggestions(
					details.vocabulary,
					label,
				);
				if (active) setSuggestions(nextSuggestions);
			} catch {
				if (active) setSuggestions([]);
			} finally {
				if (active) setIsLoadingSuggestions(false);
			}
		}, 150);

		return () => {
			active = false;
			window.clearTimeout(timer);
		};
	}, [conceptOpen, details.vocabulary, factsStore, label]);

	const addConcept = async (event: FormEvent) => {
		event.preventDefault();
		const trimmedLabel = label.trim();
		if (!fact || !trimmedLabel) return;

		try {
			await factsStore.upsertMeaning(fact.id, {
				relation,
				concept: {
					vocabulary: details.vocabulary,
					key:
						selectedSuggestion?.key ??
						(details.vocabulary === 'technology'
							? trimmedLabel
							: details.vocabulary === 'entity'
								? `unknown:${conceptKey(trimmedLabel)}`
								: conceptKey(trimmedLabel)),
					label: trimmedLabel,
				},
				source: 'user',
			});
			setLabel('');
			setSelectedSuggestion(undefined);
			toast.success('Meaning added');
		} catch {
			toast.error('Could not add meaning');
		}
	};

	const removeConcept = async (link: FactConcept) => {
		if (!fact) return;
		try {
			await factsStore.deleteMeaning(fact.id, link.conceptId, link.relation);
			toast.success('Meaning removed');
		} catch {
			toast.error('Could not remove meaning');
		}
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="flex flex-col gap-6 overflow-y-auto sm:max-w-lg">
				<SheetHeader>
					<SheetTitle>Fact meaning</SheetTitle>
					<SheetDescription>{fact?.what}</SheetDescription>
				</SheetHeader>

				<section className="flex flex-col gap-3">
					<h3 className="text-sm font-medium">Current meaning</h3>
					{fact?.concepts.length ? (
						<div className="flex flex-col gap-2">
							{fact.concepts.map((link) => (
								<div
									key={`${link.relation}:${link.conceptId}`}
									className="flex items-center justify-between gap-2 rounded-md border p-2"
								>
									<SemanticBadge link={link} />
									<Button
										variant="ghost"
										size="sm"
										disabled={factsStore.isUpdatingMeaning}
										onClick={() => removeConcept(link)}
									>
										<Trash2 data-icon="inline-start" />
										Remove
									</Button>
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">
							No semantic meaning has been added yet.
						</p>
					)}
				</section>

				<form className="flex flex-col gap-4" onSubmit={addConcept}>
					<h3 className="text-sm font-medium">Add meaning</h3>
					<div className="flex flex-col gap-2">
						<Label htmlFor="fact-relation">Relationship</Label>
						<Select
							value={relation}
							onValueChange={(value) => setRelation(value as Relation)}
						>
							<SelectTrigger id="fact-relation">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{RELATIONS.map((candidate) => (
										<SelectItem key={candidate.value} value={candidate.value}>
											{candidate.label}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>

					<div className="flex flex-col gap-2">
						<Label id="fact-concept-label">Concept</Label>
						<Combobox
							open={conceptOpen}
							onOpenChange={setConceptOpen}
							value={label}
							selectedValue={selectedSuggestion?.key}
							onValueChange={(value, option) => {
								setLabel(value);
								setSelectedSuggestion(
									option
										? suggestions.find(
												(suggestion) => suggestion.key === option.value,
											)
										: undefined,
								);
							}}
							options={comboboxOptions}
							placeholder={`Select or enter ${suggestionType}`}
							searchPlaceholder={`Search ${suggestionType}`}
							emptyMessage={
								label.trim()
									? 'No matches. You can use the value you entered.'
									: `No ${suggestionType} available yet.`
							}
							loadingMessage="Loading suggestions…"
							groupLabel="Suggestions"
							isLoading={isLoadingSuggestions}
							shouldFilter={false}
							ariaLabelledby="fact-concept-label"
						/>
					</div>

					<Button type="submit" disabled={!label.trim() || factsStore.isUpdatingMeaning}>
						{factsStore.isUpdatingMeaning ? (
							<Spinner data-icon="inline-start" />
						) : (
							<Plus data-icon="inline-start" />
						)}
						Add meaning
					</Button>
				</form>
			</SheetContent>
		</Sheet>
	);
});

export const FactsView: FC = observer(() => {
	const { factsStore } = useStore();
	const { facts, loading, isExtracting } = factsStore;
	const [search, setSearch] = useState('');
	const [relationFilter, setRelationFilter] = useState('all');
	const [selectedFactId, setSelectedFactId] = useState<string>();
	const selectedFact = facts.find((fact) => fact.id === selectedFactId);

	const filteredFacts = useMemo(() => {
		const query = search.trim().toLocaleLowerCase();
		return facts.filter((fact) => {
			const matchesRelation =
				relationFilter === 'all' ||
				fact.concepts.some((link) => link.relation === relationFilter);
			const searchable = [
				fact.what,
				fact.impact,
				fact.scale,
				...fact.concepts.map((link) => link.concept.label),
			]
				.filter(Boolean)
				.join(' ')
				.toLocaleLowerCase();
			return matchesRelation && (!query || searchable.includes(query));
		});
	}, [facts, relationFilter, search]);

	const factsGrouped = useMemo(() => groupFacts(filteredFacts), [filteredFacts]);
	const entityTypes = Object.keys(factsGrouped);

	return (
		<div className="flex h-full w-full flex-col gap-6 overflow-y-auto p-6">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold text-foreground">Facts</h1>
					<p className="text-sm text-muted-foreground">
						Recorded evidence about your experience and what it supports.
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					disabled={isExtracting}
					onClick={() => factsStore.extractFacts()}
				>
					{isExtracting && <Spinner data-icon="inline-start" />}
					{isExtracting ? 'Extracting…' : 'Extract Facts'}
				</Button>
			</div>

			<div className="flex flex-col gap-3 sm:flex-row">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
					<Input
						aria-label="Search facts and concepts"
						className="pl-9"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search facts and meaning"
					/>
				</div>
				<Select value={relationFilter} onValueChange={setRelationFilter}>
					<SelectTrigger className="sm:w-48" aria-label="Filter by relationship">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectItem value="all">All relationships</SelectItem>
							{RELATIONS.map((relation) => (
								<SelectItem key={relation.value} value={relation.value}>
									{relation.label}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
			</div>

			{loading ? (
				<p className="text-sm text-muted-foreground">Loading…</p>
			) : entityTypes.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					{facts.length === 0
						? 'No facts recorded yet.'
						: 'No facts match these filters.'}
				</p>
			) : (
				<div className="flex flex-col gap-8">
					{entityTypes.map((entityType) => (
						<EntityTypeGroup
							key={entityType}
							entityType={entityType}
							entityMap={factsGrouped[entityType]}
							onEdit={setSelectedFactId}
						/>
					))}
				</div>
			)}

			<MeaningEditor
				fact={selectedFact}
				open={selectedFactId !== undefined}
				onOpenChange={(open) => !open && setSelectedFactId(undefined)}
			/>
		</div>
	);
});
