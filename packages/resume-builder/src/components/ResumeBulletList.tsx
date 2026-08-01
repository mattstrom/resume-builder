import { type Bullet, BulletSourceType, type ResumeBullet } from '@resume-builder/entities';
import { Plus, X } from 'lucide-react';
import { observer } from 'mobx-react';
import { nanoid } from 'nanoid';
import { type FC, useMemo, useState } from 'react';

import { HighlightRegion } from '@/components/HighlightRegion.tsx';
import { InlineMarkdown } from '@/components/InlineMarkdown.tsx';
import { ReorderControls } from '@/components/ReorderControls.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Input } from '@/components/ui/input.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { getActiveResumeController } from '@/lib/active-resume-controller.ts';
import { getBulletPickerCandidates } from '@/lib/bullet-picker.ts';
import { reorderItems } from '@/lib/reorder.ts';
import { useStore } from '@/stores/store.provider.tsx';

interface ResumeBulletListProps {
	path: string;
	items: ResumeBullet[];
	resumeId: string;
	sourceType: BulletSourceType;
	sourceId?: string;
	className?: string;
}

function createResumeBullet(text: string, bulletId?: string): ResumeBullet {
	return { _id: `b_${nanoid()}`, text, bulletId };
}

export const ResumeBulletList: FC<ResumeBulletListProps> = observer(
	({ path, items, resumeId, sourceType, sourceId, className }) => {
		const { bulletsStore, uiStateStore } = useStore();
		const [pickerOpen, setPickerOpen] = useState(false);
		const [search, setSearch] = useState('');
		const controller = getActiveResumeController(resumeId);
		const isEditable = uiStateStore.isResumeEditable;
		const usedBulletIds = new Set(
			items.flatMap((item) => (item.bulletId ? [item.bulletId] : [])),
		);

		const candidates = useMemo(() => {
			return getBulletPickerCandidates(bulletsStore.bullets, {
				search,
				sourceType,
				sourceId,
			});
		}, [bulletsStore.bullets, search, sourceId, sourceType]);

		const commit = (nextItems: ResumeBullet[]) => controller?.setField(path, nextItems);
		const addFromBank = (bullet: Bullet) => {
			if (usedBulletIds.has(bullet.id)) return;
			commit([...items, createResumeBullet(bullet.text, bullet.id)]);
			setPickerOpen(false);
		};

		if (!isEditable && items.length === 0) return null;

		return (
			<>
				<ul className={className}>
					{items.map((item, index) => (
						<HighlightRegion key={item._id} path={`${path}.${index}`} label={item.text}>
							<li data-pagination-subunit={`${path}.${index}`}>
								<InlineMarkdown
									value={item.text}
									isEditable={false}
									onEditRequest={() => {}}
								/>
								{isEditable && (
									<div className="print:hidden mt-1 flex flex-col gap-1 rounded-md border border-border bg-background p-2">
										<Textarea
											aria-label="Resume bullet text"
											defaultValue={item.text}
											onBlur={(event) => {
												const text = event.target.value.trim();
												if (text && text !== item.text) {
													commit(
														items.map((entry, itemIndex) =>
															itemIndex === index
																? { ...entry, text }
																: entry,
														),
													);
												}
											}}
										/>
										<div className="flex items-center gap-2">
											{item.bulletId && <Badge variant="outline">Bank</Badge>}
											<ReorderControls
												direction="vertical"
												canMoveBackward={index > 0}
												canMoveForward={index < items.length - 1}
												onMoveBackward={() =>
													commit(reorderItems(items, index, index - 1))
												}
												onMoveForward={() =>
													commit(reorderItems(items, index, index + 1))
												}
												label="bullet"
											/>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												onClick={() =>
													commit(
														items.filter(
															(_, itemIndex) => itemIndex !== index,
														),
													)
												}
												aria-label="Remove bullet"
											>
												<X />
											</Button>
										</div>
									</div>
								)}
							</li>
						</HighlightRegion>
					))}
				</ul>

				{isEditable && (
					<div className="print:hidden mt-2 flex gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => commit([...items, createResumeBullet('New bullet')])}
						>
							<Plus data-icon="inline-start" />
							Add local
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setPickerOpen(true)}
						>
							Add from bank
						</Button>
					</div>
				)}

				<Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
					<DialogContent>
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
						<ScrollArea className="max-h-96">
							<div className="flex flex-col gap-2 pr-3">
								{candidates.map((bullet) => {
									const used = usedBulletIds.has(bullet.id);
									const matches =
										bullet.sourceType === sourceType &&
										bullet.sourceId === sourceId;
									return (
										<Button
											key={bullet.id}
											type="button"
											variant="outline"
											className="h-auto justify-start whitespace-normal text-left"
											disabled={used}
											onClick={() => addFromBank(bullet)}
										>
											<span className="flex flex-col gap-1">
												<span>{bullet.text}</span>
												<span className="flex gap-1">
													<Badge variant="secondary">
														{bullet.status}
													</Badge>
													{matches && (
														<Badge variant="outline">
															Matching source
														</Badge>
													)}
													{used && (
														<Badge variant="outline">
															Already used
														</Badge>
													)}
												</span>
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
