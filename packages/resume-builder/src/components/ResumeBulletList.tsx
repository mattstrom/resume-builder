import { useQuery } from '@apollo/client/react';
import { type Bullet, BulletSourceType, type ResumeBullet } from '@resume-builder/entities';
import {
	ArrowDown,
	ArrowUp,
	BetweenVerticalEnd,
	BetweenVerticalStart,
	Library,
	type LucideIcon,
	Pencil,
	Trash2,
} from 'lucide-react';
import { observer } from 'mobx-react';
import { nanoid } from 'nanoid';
import { Fragment, type FC, useEffect, useMemo, useState } from 'react';

import { HighlightRegion } from '@/components/HighlightRegion.tsx';
import { InlineMarkdown } from '@/components/InlineMarkdown.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog.tsx';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { Input } from '@/components/ui/input.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { SEARCH_BULLETS } from '@/graphql/queries.ts';
import { getActiveResumeController } from '@/lib/active-resume-controller.ts';
import { bulletFromGraphql, type GraphqlBullet } from '@/lib/bullet-graphql.ts';
import {
	type BulletPickerCandidate,
	getBulletPickerCandidates,
	mergeBulletPickerCandidates,
} from '@/lib/bullet-picker.ts';
import { reorderItems } from '@/lib/reorder.ts';
import { conceptRelationPresentation } from '@/lib/semantic-concepts.ts';
import { useStore } from '@/stores/store.provider.tsx';

interface ResumeBulletListProps {
	path: string;
	items: ResumeBullet[];
	resumeId: string;
	sourceType: BulletSourceType;
	sourceId?: string;
	className?: string;
}

interface SearchBulletsData {
	searchBullets: Array<{ bullet: GraphqlBullet; score: number }>;
}

function createResumeBullet(text: string, bulletId?: string): ResumeBullet {
	return { _id: `b_${nanoid()}`, text, bulletId };
}

interface InsertBulletMenuProps {
	label: string;
	icon?: LucideIcon;
	onWrite: () => void;
	onChooseFromBank: () => void;
}

const InsertBulletMenu: FC<InsertBulletMenuProps> = ({
	label,
	icon: Icon,
	onWrite,
	onChooseFromBank,
}) => (
	<DropdownMenu>
		<DropdownMenuTrigger asChild>
			<Button
				type="button"
				variant="ghost"
				size={Icon ? 'icon' : 'sm'}
				className={Icon ? 'size-7' : undefined}
				aria-label={label}
				title={label}
			>
				{Icon ? <Icon /> : label}
			</Button>
		</DropdownMenuTrigger>
		<DropdownMenuContent align="end">
			<DropdownMenuGroup>
				<DropdownMenuItem onSelect={onWrite}>
					<Pencil />
					Write a bullet
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={onChooseFromBank}>
					<Library />
					Choose from bank
				</DropdownMenuItem>
			</DropdownMenuGroup>
		</DropdownMenuContent>
	</DropdownMenu>
);

export const ResumeBulletList: FC<ResumeBulletListProps> = observer(
	({ path, items, resumeId, sourceType, sourceId, className }) => {
		const { bulletsStore, uiStateStore } = useStore();
		const [pickerOpen, setPickerOpen] = useState(false);
		const [search, setSearch] = useState('');
		const [debouncedSearch, setDebouncedSearch] = useState('');
		const [editingId, setEditingId] = useState<string>();
		const [draft, setDraft] = useState('');
		const [insertionIndex, setInsertionIndex] = useState<number>();
		const controller = getActiveResumeController(resumeId);
		const isEditable = uiStateStore.isResumeEditable;
		const usedBulletIds = new Set(
			items.flatMap((item) => (item.bulletId ? [item.bulletId] : [])),
		);

		useEffect(() => {
			const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
			return () => window.clearTimeout(timeout);
		}, [search]);

		const semanticSearchEnabled = pickerOpen && debouncedSearch.length >= 2;
		const {
			data: semanticData,
			loading: semanticLoading,
			error: semanticError,
		} = useQuery<SearchBulletsData>(SEARCH_BULLETS, {
			variables: {
				query: debouncedSearch,
				filter: { includeArchived: false },
				limit: 10,
				minimumScore: 0.55,
			},
			skip: !semanticSearchEnabled,
			fetchPolicy: 'network-only',
		});

		const textCandidates = useMemo(() => {
			return getBulletPickerCandidates(bulletsStore.bullets, {
				search,
				sourceType,
				sourceId,
			});
		}, [bulletsStore.bullets, search, sourceId, sourceType]);
		const candidates = useMemo<BulletPickerCandidate[]>(() => {
			const hasCurrentSemanticResults =
				semanticSearchEnabled && search.trim() === debouncedSearch && semanticData;
			if (!hasCurrentSemanticResults) {
				return textCandidates.map((bullet) => ({ bullet }));
			}
			return mergeBulletPickerCandidates(
				semanticData.searchBullets.map(({ bullet, score }) => ({
					bullet: bulletFromGraphql(bullet),
					score,
				})),
				textCandidates,
			);
		}, [debouncedSearch, search, semanticData, semanticSearchEnabled, textCandidates]);

		const commit = (nextItems: ResumeBullet[]) => controller?.setField(path, nextItems);
		const beginEdit = (item: ResumeBullet) => {
			setInsertionIndex(undefined);
			setEditingId(item._id);
			setDraft(item.text);
		};
		const beginLocalBullet = (index: number) => {
			setInsertionIndex(index);
			setEditingId('new');
			setDraft('');
		};
		const beginBankBullet = (index: number) => {
			setInsertionIndex(index);
			setPickerOpen(true);
		};
		const cancelEdit = () => {
			setEditingId(undefined);
			setDraft('');
			setInsertionIndex(undefined);
		};
		const saveEdit = () => {
			const text = draft.trim();
			if (!text) {
				cancelEdit();
				return;
			}
			if (editingId === 'new') {
				const index = insertionIndex ?? items.length;
				commit([...items.slice(0, index), createResumeBullet(text), ...items.slice(index)]);
			} else {
				commit(items.map((item) => (item._id === editingId ? { ...item, text } : item)));
			}
			cancelEdit();
		};
		const addFromBank = (bullet: Bullet) => {
			if (usedBulletIds.has(bullet.id)) return;
			const index = insertionIndex ?? items.length;
			commit([
				...items.slice(0, index),
				createResumeBullet(bullet.text, bullet.id),
				...items.slice(index),
			]);
			setPickerOpen(false);
			setInsertionIndex(undefined);
		};

		if (!isEditable && items.length === 0) return null;

		const newBulletEditor = (
			<li className="print:hidden">
				<Textarea
					aria-label="New resume bullet text"
					autoFocus
					className="border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 [color-scheme:light]"
					placeholder="Write a bullet"
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === 'Enter' && !event.shiftKey) {
							event.preventDefault();
							saveEdit();
						}
						if (event.key === 'Escape') cancelEdit();
					}}
				/>
			</li>
		);

		return (
			<>
				<ul className={className}>
					{items.map((item, index) => (
						<Fragment key={item._id}>
							{editingId === 'new' && insertionIndex === index && newBulletEditor}
							<HighlightRegion path={`${path}.${index}`} label={item.text}>
								<li
									className="group/resume-bullet relative"
									data-pagination-subunit={`${path}.${index}`}
								>
									{editingId === item._id ? (
										<Textarea
											aria-label="Resume bullet text"
											autoFocus
											className="print:hidden border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 [color-scheme:light]"
											value={draft}
											onChange={(event) => setDraft(event.target.value)}
											onKeyDown={(event) => {
												if (event.key === 'Enter' && !event.shiftKey) {
													event.preventDefault();
													saveEdit();
												}
												if (event.key === 'Escape') cancelEdit();
											}}
										/>
									) : (
										<InlineMarkdown
											value={item.text}
											isEditable={false}
											onEditRequest={() => {}}
										/>
									)}
									{isEditable && !editingId && (
										<div className="print:hidden absolute right-full top-0 flex gap-0.5 rounded-md border bg-background p-0.5 opacity-0 shadow-sm transition-opacity group-focus-within/resume-bullet:opacity-100 group-hover/resume-bullet:opacity-100">
											<InsertBulletMenu
												label="Insert Above"
												icon={BetweenVerticalStart}
												onWrite={() => beginLocalBullet(index)}
												onChooseFromBank={() => beginBankBullet(index)}
											/>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="size-7"
												onClick={() => beginEdit(item)}
												aria-label="Edit bullet"
												title="Edit bullet"
											>
												<Pencil />
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="size-7"
												disabled={index === 0}
												onClick={() =>
													commit(reorderItems(items, index, index - 1))
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
												disabled={index === items.length - 1}
												onClick={() =>
													commit(reorderItems(items, index, index + 1))
												}
												aria-label="Move bullet down"
												title="Move bullet down"
											>
												<ArrowDown />
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="size-7"
												onClick={() =>
													commit(
														items.filter(
															(_, itemIndex) => itemIndex !== index,
														),
													)
												}
												aria-label="Remove bullet"
												title="Remove bullet"
											>
												<Trash2 />
											</Button>
											<InsertBulletMenu
												label="Insert Below"
												icon={BetweenVerticalEnd}
												onWrite={() => beginLocalBullet(index + 1)}
												onChooseFromBank={() => beginBankBullet(index + 1)}
											/>
										</div>
									)}
								</li>
							</HighlightRegion>
						</Fragment>
					))}
					{editingId === 'new' && insertionIndex === items.length && newBulletEditor}
					{isEditable && items.length === 0 && !editingId && (
						<li className="print:hidden relative min-h-8 list-none">
							<div className="absolute right-full top-0 rounded-md border bg-background p-0.5 shadow-sm">
								<InsertBulletMenu
									label="Insert Bullet"
									onWrite={() => beginLocalBullet(0)}
									onChooseFromBank={() => beginBankBullet(0)}
								/>
							</div>
						</li>
					)}
				</ul>

				<Dialog
					open={pickerOpen}
					onOpenChange={(open) => {
						setPickerOpen(open);
						if (!open) setInsertionIndex(undefined);
					}}
				>
					<DialogContent className="sm:max-w-2xl">
						<DialogHeader>
							<DialogTitle>Add from bullet bank</DialogTitle>
							<DialogDescription>
								Matching source bullets appear first. Drafts are available but
								clearly marked.
							</DialogDescription>
						</DialogHeader>
						<Input
							aria-label="Search bullets"
							placeholder="Search all bullets"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
						/>
						{semanticLoading && search.trim() === debouncedSearch && (
							<p className="text-xs text-muted-foreground">
								Finding semantic matches…
							</p>
						)}
						{semanticError && (
							<p className="text-xs text-muted-foreground">
								Semantic matching is unavailable; showing text matches.
							</p>
						)}
						<ScrollArea className="max-h-96">
							<div className="flex flex-col gap-2 pr-3">
								{candidates.map(({ bullet, semanticScore }) => {
									const used = usedBulletIds.has(bullet.id);
									const matches =
										bullet.sourceType === sourceType &&
										bullet.sourceId === sourceId;
									const conceptSummary = bullet.concepts
										.map(({ concept, relation }) => {
											const presentation =
												conceptRelationPresentation(relation);
											return `${presentation.label}: ${concept.label}`;
										})
										.join(' · ');
									return (
										<Button
											key={bullet.id}
											type="button"
											variant="outline"
											className="h-auto w-full min-w-0 items-start justify-start whitespace-normal px-3 py-3 text-left"
											disabled={used}
											onClick={() => addFromBank(bullet)}
										>
											<span className="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden">
												<span className="line-clamp-2 leading-snug">
													{bullet.text}
												</span>
												<span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
													<Badge
														variant="secondary"
														className="shrink-0 capitalize"
													>
														{bullet.status}
													</Badge>
													{matches && <span>Matching source</span>}
													{semanticScore !== undefined && (
														<span>
															Similarity {semanticScore.toFixed(2)}
														</span>
													)}
													{used && <span>Already used</span>}
												</span>
												{conceptSummary && (
													<span
														className="truncate text-xs font-normal text-muted-foreground"
														title={conceptSummary}
													>
														{conceptSummary}
													</span>
												)}
											</span>
										</Button>
									);
								})}
							</div>
						</ScrollArea>
					</DialogContent>
				</Dialog>
			</>
		);
	},
);

export { BulletSourceType };
