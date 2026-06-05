import { observer } from 'mobx-react';
import type { FC } from 'react';

import { Badge } from '@/components/ui/badge.tsx';
import type { Fact } from '@/stores/facts.store.ts';
import { useStore } from '@/stores/store.provider.tsx';

interface FactCardProps {
	fact: Fact;
}

const FactCard: FC<FactCardProps> = ({ fact }) => (
	<div className="flex flex-col gap-2 rounded-md border border-border bg-card p-4">
		<p className="text-sm font-medium text-foreground">{fact.what}</p>

		{fact.impact && (
			<p className="text-xs text-muted-foreground">
				<span className="font-medium text-foreground/70">Impact:</span> {fact.impact}
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

		{(fact.tags.length > 0 || fact.technologies.length > 0) && (
			<div className="flex flex-wrap gap-1.5 pt-1">
				{fact.tags.map((tag) => (
					<Badge key={tag} variant="secondary" className="text-xs font-normal">
						{tag}
					</Badge>
				))}
				{fact.technologies.map((tech) => (
					<Badge key={tech} variant="outline" className="text-xs font-normal">
						{tech}
					</Badge>
				))}
			</div>
		)}
	</div>
);

interface KindGroupProps {
	kind: string;
	facts: Fact[];
}

const KindGroup: FC<KindGroupProps> = ({ kind, facts }) => (
	<div className="flex flex-col gap-2">
		<h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
			{kind}
		</h3>
		{facts.map((fact) => (
			<FactCard key={fact.id} fact={fact} />
		))}
	</div>
);

interface EntityGroupProps {
	entityId: string;
	kindMap: Record<string, Fact[]>;
}

const EntityGroup: FC<EntityGroupProps> = ({ entityId, kindMap }) => (
	<div className="flex flex-col gap-4 rounded-lg border border-border/50 p-4">
		{entityId && <p className="text-xs text-muted-foreground/70 font-mono">{entityId}</p>}
		{Object.keys(kindMap).map((kind) => (
			<KindGroup key={kind} kind={kind} facts={kindMap[kind]} />
		))}
	</div>
);

interface EntityTypeGroupProps {
	entityType: string;
	entityMap: Record<string, Record<string, Fact[]>>;
}

const EntityTypeGroup: FC<EntityTypeGroupProps> = ({ entityType, entityMap }) => (
	<section className="flex flex-col gap-3">
		<h2 className="text-base font-semibold capitalize text-foreground">
			{entityType || 'General'}
		</h2>
		{Object.keys(entityMap).map((entityId) => (
			<EntityGroup key={entityId} entityId={entityId} kindMap={entityMap[entityId]} />
		))}
	</section>
);

export const FactsView: FC = observer(() => {
	const { factsStore } = useStore();
	const { factsGrouped, loading } = factsStore;
	const entityTypes = Object.keys(factsGrouped);

	return (
		<div className="flex h-full w-full flex-col gap-8 overflow-y-auto p-6">
			<div>
				<h1 className="text-2xl font-semibold text-foreground">Facts</h1>
				<p className="text-sm text-muted-foreground">
					Recorded facts about your experience, organized by category.
				</p>
			</div>

			{loading ? (
				<p className="text-sm text-muted-foreground">Loading…</p>
			) : entityTypes.length === 0 ? (
				<p className="text-sm text-muted-foreground">No facts recorded yet.</p>
			) : (
				<div className="flex flex-col gap-8">
					{entityTypes.map((entityType) => (
						<EntityTypeGroup
							key={entityType}
							entityType={entityType}
							entityMap={factsGrouped[entityType]}
						/>
					))}
				</div>
			)}
		</div>
	);
});
