import type { Job } from '@resume-builder/entities';
import { Trash2 } from 'lucide-react';
import { observer } from 'mobx-react';
import { type FC, type PropsWithChildren } from 'react';

import { AddItemGhostRow } from '@/components/AddItemGhostRow.tsx';
import { CollectionEditor } from '@/components/CollectionEditor.tsx';
import { CollectionEditorItem } from '@/components/CollectionEditorItem.tsx';
import { Button } from '@/components/ui/button.tsx';
import { getResumeCollectionPath, ResumeCollections } from '@/graphql/resume-collections.ts';
import { getActiveResumeController } from '@/lib/active-resume-controller.ts';
import { useStore } from '@/stores/store.provider.tsx';

import { useResume, useResumeId } from '../Resume.provider.tsx';
import { JobSection } from './JobSection.tsx';
import { RESUME_SECTION_IDS } from './section-anchors.ts';
import { Section } from './Section.tsx';

interface WorkExperienceProps extends PropsWithChildren {}

export const WorkExperience: FC<WorkExperienceProps> = observer(() => {
	const { workExperience } = useResume();
	const items = workExperience ?? [];
	const resumeId = useResumeId();
	const { uiStateStore } = useStore();
	const isEditable = uiStateStore.isResumeEditable;
	const controller = getActiveResumeController(resumeId);
	const isSaving = false;

	return (
		<CollectionEditor<Job>
			path="data.workExperience"
			label="Work Experience"
			items={items}
			isSaving={isSaving}
			isEditable={isEditable}
			onAdd={async () => {
				controller?.addCollectionItem(ResumeCollections.WORK_EXPERIENCE);
			}}
			onInsert={async (index) => {
				controller?.insertCollectionItem(ResumeCollections.WORK_EXPERIENCE, index);
			}}
			onRemove={async (index) => {
				controller?.removeCollectionItem(ResumeCollections.WORK_EXPERIENCE, index);
			}}
			onMove={async (fromIndex, toIndex) => {
				controller?.moveArrayItem(
					getResumeCollectionPath(ResumeCollections.WORK_EXPERIENCE),
					fromIndex,
					toIndex,
				);
			}}
		>
			{({ items, insertItem, removeItem, moveItem, isSaving }) => (
				<Section
					heading="Work History"
					className="work-experience"
					anchorId={RESUME_SECTION_IDS.workHistory}
				>
					{items.length === 0 && isEditable ? (
						<AddItemGhostRow
							label="job"
							onAdd={() => void insertItem(0)}
							disabled={isSaving}
						/>
					) : (
						items.map((item, index) => (
							<CollectionEditorItem
								key={item._id}
								index={index}
								length={items.length}
								label="job"
								path={`data.workExperience.${index}`}
								paginationUnit={`work-experience-${item._id ?? index}`}
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
											aria-label="Remove job"
											title="Remove job"
										>
											<Trash2 />
										</Button>
									) : null
								}
							>
								<JobSection job={item} index={index} />
							</CollectionEditorItem>
						))
					)}
				</Section>
			)}
		</CollectionEditor>
	);
});
