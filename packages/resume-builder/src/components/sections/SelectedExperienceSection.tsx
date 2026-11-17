import type { ResumeSelectedExperience } from '@resume-builder/entities';
import { Trash2 } from 'lucide-react';
import { observer } from 'mobx-react';
import { type FC } from 'react';

import { AddItemGhostRow } from '@/components/AddItemGhostRow.tsx';
import { CollectionEditor } from '@/components/CollectionEditor.tsx';
import { CollectionEditorItem } from '@/components/CollectionEditorItem.tsx';
import { InlineEditor } from '@/components/InlineEditor.tsx';
import { ResumeBulletList } from '@/components/ResumeBulletList.tsx';
import { Button } from '@/components/ui/button.tsx';
import { getResumeCollectionPath, ResumeCollections } from '@/graphql/resume-collections.ts';
import { getActiveResumeController } from '@/lib/active-resume-controller.ts';
import { useStore } from '@/stores/store.provider.tsx';

import { useResume, useResumeId } from '../Resume.provider.tsx';
import { RESUME_SECTION_IDS } from './section-anchors.ts';
import { Section } from './Section.tsx';

const COLLECTION = ResumeCollections.SELECTED_EXPERIENCE;
/**
 * Optional section of titled highlight groups. With no entries it renders
 * nothing outside the editor, and only an "add" affordance inside it.
 */
export const SelectedExperienceSection: FC = observer(
	() => {
		const { selectedExperience } = useResume();
		const items = selectedExperience ?? [];
		const resumeId = useResumeId();
		const { uiStateStore } = useStore();
		const isEditable = uiStateStore.isResumeEditable;
		const controller = getActiveResumeController(resumeId);
		const isSaving = false;

		if (items.length === 0) {
			return isEditable ? (
				<div className="print:hidden">
					<AddItemGhostRow
						label="Selected Experience section"
						onAdd={() => controller?.addCollectionItem(COLLECTION)}
					/>
				</div>
			) : null;
		}

		return (
			<CollectionEditor<ResumeSelectedExperience>
				path="data.selectedExperience"
				label="Selected Experience"
				items={items}
				isSaving={isSaving}
				isEditable={isEditable}
				onAdd={async () => {
					controller?.addCollectionItem(COLLECTION);
				}}
				onInsert={async (index) => {
					controller?.insertCollectionItem(COLLECTION, index);
				}}
				onRemove={async (index) => {
					controller?.removeCollectionItem(COLLECTION, index);
				}}
				onMove={async (fromIndex, toIndex) => {
					controller?.moveArrayItem(
						getResumeCollectionPath(COLLECTION),
						fromIndex,
						toIndex,
					);
				}}
			>
				{({ items, insertItem, removeItem, moveItem, isSaving }) => (
					<Section
						heading="Selected Experience"
						className="selected-experience"
						anchorId={RESUME_SECTION_IDS.selectedExperience}
					>
						{items.map((item, index) => (
							<CollectionEditorItem
								key={item._id}
								index={index}
								length={items.length}
								label="experience"
								path={`data.selectedExperience.${index}`}
								paginationUnit={`selected-experience-${item._id ?? index}`}
								isEditable={isEditable}
								onMove={(fromIndex, toIndex) => void moveItem(fromIndex, toIndex)}
								onInsertAbove={() => void insertItem(index)}
								onInsertBelow={() => void insertItem(index + 1)}
								actions={
									isEditable ? (
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="h-7 w-7"
											onClick={() => void removeItem(index)}
											disabled={isSaving}
											aria-label="Remove experience"
											title="Remove experience"
										>
											<Trash2 />
										</Button>
									) : null
								}
							>
								<section className="experience">
									<header className="flex items-center gap-2">
										<InlineEditor
											as="h3"
											path={`data.selectedExperience.${index}.title`}
											value={item.title}
											resumeId={resumeId}
										/>
									</header>
									<ResumeBulletList
										path={`data.selectedExperience.${index}.items`}
										items={item.items}
										resumeId={resumeId}
									/>
								</section>
							</CollectionEditorItem>
						))}
					</Section>
				)}
			</CollectionEditor>
		);
	},
);
