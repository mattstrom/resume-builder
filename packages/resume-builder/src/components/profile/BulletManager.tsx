import {
	type Bullet,
	BulletSourceType,
	BulletStatus,
	type UpdateBulletInput,
} from '@resume-builder/entities';
import { useNavigate } from '@tanstack/react-router';
import { ArrowDown, ArrowUp, Plus, RefreshCw, Sparkles, X } from 'lucide-react';
import { observer } from 'mobx-react';
import { type FC, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

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
import { Progress } from '@/components/ui/progress.tsx';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { useDataSourceController } from '@/hooks/use-data-source-controller.ts';
import { bulletSourceRoute } from '@/lib/bullet-deep-link.ts';
import { conceptRelationPresentation } from '@/lib/semantic-concepts.ts';
import { cn } from '@/lib/utils.ts';
import { useStore } from '@/stores/store.provider.tsx';

interface BulletManagerProps {
	sourceType: BulletSourceType;
	sourceId: string;
	linkedBulletId?: string;
}

type ScoreKey = 'context' | 'action' | 'outcome' | 'clarity';

const SCORE_FIELDS: Array<{ key: ScoreKey; label: string }> = [
	{ key: 'context', label: 'Context' },
	{ key: 'action', label: 'Action' },
	{ key: 'outcome', label: 'Outcome' },
	{ key: 'clarity', label: 'Clarity' },
];

type ScoreLevel = {
	label: string;
	indicatorClassName: string;
	textClassName: string;
};

function scoreLevel(score: number | null | undefined): ScoreLevel {
	if (score == null) {
		return {
			label: 'Not scored',
			indicatorClassName: 'bg-muted-foreground',
			textClassName: 'text-muted-foreground',
		};
	}

	if (score < 0.5) {
		return {
			label: 'Needs attention',
			indicatorClassName: 'bg-destructive',
			textClassName: 'text-destructive',
		};
	}

	if (score < 0.75) {
		return {
			label: 'Developing',
			indicatorClassName: 'bg-warning',
			textClassName: 'text-warning',
		};
	}

	return {
		label: 'Strong',
		indicatorClassName: 'bg-success',
		textClassName: 'text-success',
	};
}

function statusLabel(status: BulletStatus): string {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

const ConceptEditor: FC<{ bullet: Bullet }> = observer(({ bullet }) => {
	const { bulletsStore } = useStore();

	const remove = async (conceptId: string, relation: string) => {
		try {
			await bulletsStore.deleteConcept(bullet.id, conceptId, relation);
			toast.success('Concept removed');
		} catch {
			toast.error('Could not remove concept');
		}
	};

	const annotate = async () => {
		try {
			await bulletsStore.annotateConcepts(bullet.id, bullet.text);
			toast.success('Bullet concepts updated');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not annotate bullet');
		}
	};

	return (
		<section className="flex flex-col gap-3">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h5 className="text-sm font-medium">Concepts</h5>
					<p className="text-xs text-muted-foreground">
						Semantic meaning evidenced by this authoritative bullet.
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={bulletsStore.isAnnotatingConcepts}
					onClick={() => void annotate()}
				>
					{bulletsStore.isAnnotatingConcepts ? (
						<Spinner data-icon="inline-start" />
					) : (
						<Sparkles data-icon="inline-start" />
					)}
					{bulletsStore.isAnnotatingConcepts ? 'Analyzing…' : 'Analyze concepts'}
				</Button>
			</div>
			{bullet.concepts.length > 0 ? (
				<div className="flex flex-wrap gap-1">
					{bullet.concepts.map(({ conceptId, concept, relation, source }) => {
						const presentation = conceptRelationPresentation(relation);
						return (
							<Badge
								key={`${relation}:${conceptId}`}
								variant={presentation.variant}
								title={`Source: ${source}`}
								className="gap-1 py-0 pr-1"
							>
								<span className="opacity-70">{presentation.label} ·</span>
								{concept.label}
								<button
									type="button"
									disabled={bulletsStore.isUpdatingConcept}
									onClick={() => void remove(conceptId, relation)}
									aria-label={`Remove ${presentation.label} ${concept.label}`}
									className="rounded-sm opacity-60 hover:opacity-100 disabled:pointer-events-none disabled:opacity-40"
								>
									<X className="size-3" />
								</button>
							</Badge>
						);
					})}
				</div>
			) : (
				<p className="text-xs text-muted-foreground">No concepts assigned yet.</p>
			)}
		</section>
	);
});

const BulletDetail: FC<{ bullet: Bullet }> = observer(({ bullet }) => {
	const { bulletsStore } = useStore();
	const [text, setText] = useState(bullet.text);
	const [scoring, setScoring] = useState(false);

	useEffect(() => setText(bullet.text), [bullet.text]);

	const update = (input: UpdateBulletInput) => void bulletsStore.update(bullet.id, input);
	const recalculateScore = async () => {
		if (scoring || !text.trim()) return;
		setScoring(true);
		try {
			await bulletsStore.score(bullet.id, text);
			toast.success('Bullet score recalculated');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to score bullet');
		} finally {
			setScoring(false);
		}
	};

	return (
		<div className="flex min-w-0 flex-col gap-4">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h5 className="text-sm font-medium">Bullet details</h5>
					<p className="text-xs text-muted-foreground">
						Edit the text, then recalculate to refresh its checkpoints.
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={scoring || !text.trim()}
						onClick={() => void recalculateScore()}
					>
						{scoring ? (
							<Spinner data-icon="inline-start" />
						) : (
							<RefreshCw data-icon="inline-start" />
						)}
						{scoring ? 'Scoring…' : 'Recalculate score'}
					</Button>
					<Select
						value={bullet.status}
						onValueChange={(status) =>
							void bulletsStore.setStatus(bullet.id, status as BulletStatus)
						}
					>
						<SelectTrigger aria-label="Bullet status" className="w-32 shrink-0">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectItem value={BulletStatus.DRAFT}>Draft</SelectItem>
								<SelectItem value={BulletStatus.READY}>Ready</SelectItem>
								<SelectItem value={BulletStatus.ARCHIVED}>Archived</SelectItem>
							</SelectGroup>
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="flex flex-col gap-1">
				<Label htmlFor={`bullet-${bullet.id}`}>Bullet</Label>
				<Textarea
					id={`bullet-${bullet.id}`}
					value={text}
					onChange={(event) => setText(event.target.value)}
					onBlur={() => {
						const value = text.trim();
						if (value && value !== bullet.text) update({ text: value });
					}}
				/>
			</div>

			<Separator />
			<ConceptEditor bullet={bullet} />
			<Separator />

			<ScoreRow bullet={bullet} />
		</div>
	);
});

function scoreMetric(bullet: Bullet, key: ScoreKey, label: string) {
	const score = bullet[`${key}Score` as keyof Bullet] as number | null | undefined;
	const note = bullet[`${key}Note` as keyof Bullet] as string | null | undefined;
	const whatWorksWell =
		(bullet[`${key}WhatWorksWell` as keyof Bullet] as string[] | undefined) ?? [];
	const whyItMatters = bullet[`${key}WhyItMatters` as keyof Bullet] as string | null | undefined;
	const proposedEnhancements =
		(bullet[`${key}ProposedEnhancements` as keyof Bullet] as string[] | undefined) ?? [];
	const level = scoreLevel(score);
	const progress = score == null ? 0 : Math.min(100, Math.max(0, score * 100));
	const hasAnalysis =
		whatWorksWell.length > 0 || Boolean(whyItMatters) || proposedEnhancements.length > 0;

	return {
		key,
		label,
		note,
		whatWorksWell,
		whyItMatters,
		proposedEnhancements,
		level,
		progress,
		hasAnalysis,
	};
}

const ScoreRow: FC<{ bullet: Bullet }> = observer(({ bullet }) => {
	const [activeKey, setActiveKey] = useState<ScoreKey>();
	const metrics = SCORE_FIELDS.map(({ key, label }) => scoreMetric(bullet, key, label));
	const active = metrics.find((metric) => metric.key === activeKey);

	return (
		<section className="flex flex-col gap-2">
			<h5 className="text-sm font-medium">Score</h5>
			<div className="flex gap-2">
				{metrics.map((metric) => (
					<button
						key={metric.key}
						type="button"
						onClick={() =>
							setActiveKey(activeKey === metric.key ? undefined : metric.key)
						}
						className={cn(
							'flex-1 rounded-md border border-border bg-background p-2.5 text-left transition-colors hover:border-ring',
							activeKey === metric.key && 'border-ring',
						)}
					>
						<div className="flex items-center justify-between gap-2 text-xs">
							<span className="font-medium">{metric.label}</span>
							<span className={cn('font-medium', metric.level.textClassName)}>
								{metric.level.label}
							</span>
						</div>
						<Progress
							value={metric.progress}
							className="mt-2 h-1.5"
							indicatorClassName={metric.level.indicatorClassName}
							aria-label={`${metric.label} checkpoint`}
							aria-valuetext={metric.level.label}
						/>
					</button>
				))}
			</div>
			{active && (
				<div className="flex flex-col gap-3 rounded-md border border-border bg-background p-3">
					<p className="text-xs leading-relaxed text-muted-foreground">
						{active.note ??
							'Recalculate the score to generate feedback for this checkpoint.'}
					</p>
					{active.hasAnalysis && (
						<>
							<Separator />
							<AnalysisList
								title="What works well"
								items={active.whatWorksWell}
								emptyMessage="No clear strength was identified for this checkpoint."
							/>
							<Separator />
							<AnalysisSection title="Why it matters">
								{active.whyItMatters ??
									'Recalculate the score to generate an explanation.'}
							</AnalysisSection>
							<Separator />
							<AnalysisList
								title="Proposed enhancements"
								items={active.proposedEnhancements}
								emptyMessage="No material enhancement was identified."
							/>
						</>
					)}
				</div>
			)}
		</section>
	);
});

const AnalysisSection: FC<{ title: string; children: string }> = ({ title, children }) => (
	<section className="flex flex-col gap-1.5">
		<h6 className="text-xs font-medium">{title}</h6>
		<p className="text-xs leading-relaxed text-muted-foreground">{children}</p>
	</section>
);

const AnalysisList: FC<{
	title: string;
	items: string[];
	emptyMessage: string;
}> = ({ title, items, emptyMessage }) => (
	<section className="flex flex-col gap-1.5">
		<h6 className="text-xs font-medium">{title}</h6>
		{items.length > 0 ? (
			<ul className="flex list-disc flex-col gap-1 pl-4 text-xs leading-relaxed text-muted-foreground">
				{items.map((item) => (
					<li key={item}>{item}</li>
				))}
			</ul>
		) : (
			<p className="text-xs leading-relaxed text-muted-foreground">{emptyMessage}</p>
		)}
	</section>
);

const NewBulletDetail: FC<{
	onCancel: () => void;
	onCreate: (text: string) => Promise<void>;
}> = ({ onCancel, onCreate }) => {
	const [text, setText] = useState('');
	const [creating, setCreating] = useState(false);

	const create = async () => {
		const value = text.trim();
		if (!value || creating) return;
		setCreating(true);
		try {
			await onCreate(value);
		} finally {
			setCreating(false);
		}
	};

	return (
		<div className="flex flex-col gap-4">
			<div>
				<h5 className="text-sm font-medium">New draft bullet</h5>
				<p className="text-xs text-muted-foreground">
					Create the bullet first, then add CAR and clarity scoring.
				</p>
			</div>
			<div className="flex flex-col gap-1">
				<Label htmlFor="new-bullet-text">Bullet</Label>
				<Textarea
					id="new-bullet-text"
					autoFocus
					placeholder="Describe an accomplishment, action, or outcome"
					value={text}
					onChange={(event) => setText(event.target.value)}
				/>
			</div>
			<div className="flex justify-end gap-2">
				<Button type="button" variant="ghost" onClick={onCancel}>
					Cancel
				</Button>
				<Button
					type="button"
					disabled={!text.trim() || creating}
					onClick={() => void create()}
				>
					Create draft
				</Button>
			</div>
		</div>
	);
};

export const BulletManager: FC<BulletManagerProps> = observer((props) => {
	const { sourceType, sourceId, linkedBulletId } = props;
	const { bulletsStore } = useStore();
	const navigate = useNavigate();
	const [creating, setCreating] = useState(false);
	const cardRef = useRef<HTMLDivElement>(null);
	const linkedOptionRef = useRef<HTMLDivElement>(null);

	const controller = useDataSourceController<Bullet>({
		getId: (bullet) => bullet.id,
		selectionMode: 'single',
		filters: [
			{
				key: 'archived',
				label: 'Hide archived',
				predicate: (bullet) => bullet.status !== BulletStatus.ARCHIVED,
			},
		],
		defaultActiveFilterKeys: ['archived'],
	});
	controller.setItems(bulletsStore.forSource(sourceType, sourceId, true));

	const selectedBullet = controller.visibleItems.find(
		(bullet) => bullet.id === controller.selectedId,
	);
	const linkedBullet = bulletsStore.bullets.find(
		(bullet) =>
			bullet.id === linkedBulletId &&
			bullet.sourceType === sourceType &&
			bullet.sourceId === sourceId,
	);

	useEffect(() => {
		if (!linkedBullet) return;
		if (linkedBullet.status === BulletStatus.ARCHIVED) {
			controller.setFilterActive('archived', false);
		}
		setCreating(false);
		controller.select(linkedBullet.id);
	}, [linkedBullet?.id, linkedBullet?.status]);

	useEffect(() => {
		if (!linkedBulletId || controller.selectedId !== linkedBulletId) return;
		const frame = window.requestAnimationFrame(() => {
			cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			linkedOptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		});

		return () => window.cancelAnimationFrame(frame);
	}, [linkedBulletId, controller.selectedId]);

	useEffect(() => {
		if (creating || selectedBullet) return;
		const first = controller.visibleItems[0];
		if (first) {
			controller.select(first.id);
		} else {
			controller.clearSelection();
		}
	}, [controller.visibleItems, creating, selectedBullet]);

	const replaceBulletRoute = (bulletId?: string) =>
		navigate({
			to: bulletSourceRoute(sourceType),
			search: bulletId ? { bulletId } : {},
			replace: true,
		});

	const selectBullet = (bulletId: string) => {
		setCreating(false);
		controller.select(bulletId);
		void replaceBulletRoute(bulletId);
	};

	const startCreating = () => {
		controller.clearSelection();
		setCreating(true);
		void replaceBulletRoute();
	};

	const cancelCreating = () => {
		setCreating(false);
		const first = controller.visibleItems[0];
		if (first) controller.select(first.id);
	};

	const addBullet = async (text: string) => {
		const id = await bulletsStore.create({ text, sourceType, sourceId });
		setCreating(false);
		if (id) {
			controller.select(id);
			void replaceBulletRoute(id);
		} else {
			controller.clearSelection();
		}
	};

	return (
		<Card ref={cardRef}>
			<CardHeader className="flex-row items-start justify-between gap-4">
				<div>
					<CardTitle className="text-sm">Resume bullets</CardTitle>
					<CardDescription className="text-xs">
						Reusable statements for tailored resumes.
					</CardDescription>
				</div>
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2">
						<Label htmlFor={`archived-${sourceType}-${sourceId}`}>Show archived</Label>
						<Switch
							id={`archived-${sourceType}-${sourceId}`}
							checked={!controller.isFilterActive('archived')}
							onCheckedChange={(checked) => controller.setFilterActive('archived', !checked)}
						/>
					</div>
					<Button type="button" variant="outline" size="sm" onClick={startCreating}>
						<Plus data-icon="inline-start" />
						New bullet
					</Button>
				</div>
			</CardHeader>
			<CardContent className="min-h-[28rem] border-t p-0">
				<DataSourceView
					controller={controller}
					className="grid h-full grid-cols-[minmax(14rem,0.7fr)_minmax(0,1.3fr)]"
					masterClassName="flex min-w-0 flex-col overflow-y-auto"
					detailClassName="min-w-0 overflow-y-auto border-l p-4"
					itemsClassName="flex flex-col gap-1 p-2"
					itemsProps={{ role: 'listbox', 'aria-label': 'Bullets' }}
					emptyState={
						<p className="p-3 text-sm text-muted-foreground">No bullets for this item yet.</p>
					}
					renderItemMaster={({ item: bullet, isSelected }) => {
						const items = controller.visibleItems;
						const index = items.findIndex((candidate) => candidate.id === bullet.id);
						return (
							<div
								ref={bullet.id === linkedBulletId ? linkedOptionRef : undefined}
								role="option"
								aria-selected={isSelected}
								className={cn(
									'group flex items-center rounded-md border-l-2 border-l-transparent hover:bg-accent',
									isSelected &&
										'border-l-[var(--appbar-accent)] bg-accent text-accent-foreground',
								)}
							>
								<Button
									type="button"
									variant="ghost"
									className="h-auto min-w-0 flex-1 justify-start whitespace-normal px-3 py-2 text-left hover:bg-transparent"
									onClick={() => selectBullet(bullet.id)}
								>
									<span className="flex min-w-0 flex-1 flex-col items-start gap-1">
										<span className="line-clamp-2">{bullet.text}</span>
										<span className="flex flex-wrap items-center gap-1">
											<Badge
												className="py-0"
												variant={
													bullet.status === BulletStatus.DRAFT ? 'secondary' : 'outline'
												}
											>
												{statusLabel(bullet.status)}
											</Badge>
											{bullet.concepts
												.slice(0, 3)
												.map(({ conceptId, concept, relation }) => {
													const presentation = conceptRelationPresentation(relation);
													return (
														<Badge
															key={`${relation}:${conceptId}`}
															variant={presentation.variant}
															className="py-0"
														>
															{concept.label}
														</Badge>
													);
												})}
											{bullet.concepts.length > 3 && (
												<span className="text-xs text-muted-foreground">
													+{bullet.concepts.length - 3} more
												</span>
											)}
										</span>
									</span>
								</Button>
								<div
									className={cn(
										'flex shrink-0 flex-col opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100',
										isSelected && 'opacity-100',
									)}
								>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="size-7"
										disabled={index <= 0}
										onClick={() => void bulletsStore.reorder(bullet.id, items[index - 1]!.id)}
										aria-label="Move bullet up"
										title="Move bullet up"
									>
										<ArrowUp />
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="size-7"
										disabled={index === -1 || index === items.length - 1}
										onClick={() => void bulletsStore.reorder(bullet.id, items[index + 1]!.id)}
										aria-label="Move bullet down"
										title="Move bullet down"
									>
										<ArrowDown />
									</Button>
								</div>
							</div>
						);
					}}
					renderItemDetail={(bullet) =>
						creating ? (
							<NewBulletDetail onCancel={cancelCreating} onCreate={addBullet} />
						) : bullet ? (
							<BulletDetail key={bullet.id} bullet={bullet} />
						) : (
							<div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
								Select a bullet or create a new one.
							</div>
						)
					}
				/>
			</CardContent>
		</Card>
	);
});

export { BulletSourceType };
