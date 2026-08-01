import {
	type Bullet,
	BulletSourceType,
	BulletStatus,
	type UpdateBulletInput,
} from '@resume-builder/entities';
import { ArrowDown, ArrowUp, ChevronDown, Plus, RefreshCw } from 'lucide-react';
import { observer } from 'mobx-react';
import { type FC, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card.tsx';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Progress } from '@/components/ui/progress.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
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
import { cn } from '@/lib/utils.ts';
import { useStore } from '@/stores/store.provider.tsx';

interface BulletManagerProps {
	sourceType: BulletSourceType;
	sourceId: string;
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

			<div className="grid gap-3 xl:grid-cols-2">
				{SCORE_FIELDS.map(({ key, label }) => (
					<ScoreField key={key} bullet={bullet} scoreKey={key} label={label} />
				))}
			</div>
		</div>
	);
});

const ScoreField: FC<{
	bullet: Bullet;
	scoreKey: ScoreKey;
	label: string;
}> = observer(({ bullet, scoreKey, label }) => {
	const scoreField = `${scoreKey}Score` as keyof Bullet;
	const noteField = `${scoreKey}Note` as keyof Bullet;
	const whatWorksWellField = `${scoreKey}WhatWorksWell` as keyof Bullet;
	const whyItMattersField = `${scoreKey}WhyItMatters` as keyof Bullet;
	const proposedEnhancementsField = `${scoreKey}ProposedEnhancements` as keyof Bullet;
	const score = bullet[scoreField as keyof Bullet] as number | null | undefined;
	const note = bullet[noteField as keyof Bullet] as string | null | undefined;
	const whatWorksWell = (bullet[whatWorksWellField] as string[] | undefined) ?? [];
	const whyItMatters = bullet[whyItMattersField] as string | null | undefined;
	const proposedEnhancements = (bullet[proposedEnhancementsField] as string[] | undefined) ?? [];
	const level = scoreLevel(score);
	const progress = score == null ? 0 : Math.min(100, Math.max(0, score * 100));
	const hasAnalysis =
		whatWorksWell.length > 0 || Boolean(whyItMatters) || proposedEnhancements.length > 0;

	return (
		<div className="flex min-w-0 flex-col gap-3 rounded-md border border-border bg-background p-3">
			<div className="flex items-center justify-between gap-3">
				<span className="text-sm font-medium">{label}</span>
				<span className={cn('text-xs font-medium', level.textClassName)}>
					{level.label}
				</span>
			</div>
			<Progress
				value={progress}
				className="h-2"
				indicatorClassName={level.indicatorClassName}
				aria-label={`${label} checkpoint`}
				aria-valuetext={score == null ? 'Not scored' : level.label}
			/>
			<p className="text-xs leading-relaxed text-muted-foreground">
				{note ?? 'Recalculate the score to generate feedback for this checkpoint.'}
			</p>
			{hasAnalysis && (
				<Collapsible className="group flex flex-col gap-3">
					<CollapsibleTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="-mx-2 justify-between"
						>
							Analysis details
							<ChevronDown className="transition-transform group-data-[state=open]:rotate-180" />
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="flex flex-col gap-4">
						<AnalysisList
							title="What works well"
							items={whatWorksWell}
							emptyMessage="No clear strength was identified for this checkpoint."
						/>
						<Separator />
						<AnalysisSection title="Why it matters">
							{whyItMatters ?? 'Recalculate the score to generate an explanation.'}
						</AnalysisSection>
						<Separator />
						<AnalysisList
							title="Proposed enhancements"
							items={proposedEnhancements}
							emptyMessage="No material enhancement was identified."
						/>
					</CollapsibleContent>
				</Collapsible>
			)}
		</div>
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

export const BulletManager: FC<BulletManagerProps> = observer(({ sourceType, sourceId }) => {
	const { bulletsStore } = useStore();
	const [showArchived, setShowArchived] = useState(false);
	const [selectedId, setSelectedId] = useState<string>();
	const [creating, setCreating] = useState(false);
	const bullets = bulletsStore.forSource(sourceType, sourceId, showArchived);
	const selectedBullet = bullets.find((bullet) => bullet.id === selectedId);

	useEffect(() => {
		if (creating || selectedBullet) return;
		setSelectedId(bullets[0]?.id);
	}, [bullets, creating, selectedBullet]);

	const addBullet = async (text: string) => {
		const id = await bulletsStore.create({ text, sourceType, sourceId });
		setCreating(false);
		setSelectedId(id);
	};

	return (
		<Card>
			<CardHeader className="flex-row items-start justify-between gap-4">
				<div>
					<CardTitle className="text-sm">Resume bullets</CardTitle>
					<CardDescription className="text-xs">
						Reusable statements for tailored resumes.
					</CardDescription>
				</div>
				<div className="flex items-center gap-2">
					<Label htmlFor={`archived-${sourceType}-${sourceId}`}>Show archived</Label>
					<Switch
						id={`archived-${sourceType}-${sourceId}`}
						checked={showArchived}
						onCheckedChange={setShowArchived}
					/>
				</div>
			</CardHeader>
			<CardContent className="grid min-h-[28rem] grid-cols-[minmax(14rem,0.7fr)_minmax(0,1.3fr)] border-t p-0">
				<div className="flex min-w-0 flex-col">
					<div className="p-3">
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="w-full"
							onClick={() => {
								setSelectedId(undefined);
								setCreating(true);
							}}
						>
							<Plus data-icon="inline-start" />
							New bullet
						</Button>
					</div>
					<Separator />
					<ScrollArea className="h-[28rem]">
						<div
							className="flex flex-col gap-1 p-2"
							role="listbox"
							aria-label="Bullets"
						>
							{bullets.map((bullet, index) => {
								const selected = !creating && bullet.id === selectedId;
								return (
									<div
										key={bullet.id}
										role="option"
										aria-selected={selected}
										className={cn(
											'group flex items-center rounded-md border-l-2 border-l-transparent hover:bg-accent',
											selected &&
												'border-l-[var(--appbar-accent)] bg-accent text-accent-foreground',
										)}
									>
										<Button
											type="button"
											variant="ghost"
											className="h-auto min-w-0 flex-1 justify-start whitespace-normal px-3 py-2 text-left hover:bg-transparent"
											onClick={() => {
												setCreating(false);
												setSelectedId(bullet.id);
											}}
										>
											<span className="flex min-w-0 flex-1 flex-col items-start gap-1">
												<span className="line-clamp-2">{bullet.text}</span>
												<Badge
													variant={
														bullet.status === BulletStatus.DRAFT
															? 'secondary'
															: 'outline'
													}
												>
													{statusLabel(bullet.status)}
												</Badge>
											</span>
										</Button>
										<div
											className={cn(
												'flex shrink-0 flex-col opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100',
												selected && 'opacity-100',
											)}
										>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="size-7"
												disabled={index === 0}
												onClick={() =>
													void bulletsStore.reorder(
														bullet.id,
														bullets[index - 1].id,
													)
												}
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
												disabled={index === bullets.length - 1}
												onClick={() =>
													void bulletsStore.reorder(
														bullet.id,
														bullets[index + 1].id,
													)
												}
												aria-label="Move bullet down"
												title="Move bullet down"
											>
												<ArrowDown />
											</Button>
										</div>
									</div>
								);
							})}
							{bullets.length === 0 && (
								<p className="p-3 text-sm text-muted-foreground">
									No bullets for this item yet.
								</p>
							)}
						</div>
					</ScrollArea>
				</div>

				<div className="min-w-0 border-l p-4">
					{creating ? (
						<NewBulletDetail
							onCancel={() => {
								setCreating(false);
								setSelectedId(bullets[0]?.id);
							}}
							onCreate={addBullet}
						/>
					) : selectedBullet ? (
						<BulletDetail key={selectedBullet.id} bullet={selectedBullet} />
					) : (
						<div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
							Select a bullet or create a new one.
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
});

export { BulletSourceType };
