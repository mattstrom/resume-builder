import { CollectionEditorItem } from '@/components/CollectionEditorItem.tsx';
import { CollectionEditor } from '@/components/CollectionEditor.tsx';
import {
	getResumeCollectionPath,
	ResumeCollections,
} from '@/graphql/resume-collections.ts';
import { Button } from '@/components/ui/button.tsx';
import { getActiveResumeController } from '@/lib/active-resume-controller.ts';
import { useStore } from '@/stores/store.provider.tsx';
import type { Job } from '@resume-builder/entities';
import { type FC, type PropsWithChildren } from 'react';
import { observer } from 'mobx-react';
import { Section } from './Section.tsx';
import { useResume, useResumeId } from '../Resume.provider.tsx';
import { JobSection } from './JobSection.tsx';

interface WorkExperienceProps extends PropsWithChildren {}

export const WorkExperience: FC<WorkExperienceProps> = observer(() => {
	const { workExperience } = useResume();
	const resumeId = useResumeId();
	const { uiStateStore } = useStore();
	const isEditable = uiStateStore.isResumeEditable;
	const controller = getActiveResumeController(resumeId);
	const isSaving = false;

	return (
		<CollectionEditor<Job>
			items={workExperience}
			isSaving={isSaving}
			isEditable={isEditable}
			onAdd={async () => {
				controller?.addCollectionItem(
					ResumeCollections.WORK_EXPERIENCE,
				);
			}}
			onRemove={async (index) => {
				controller?.removeCollectionItem(
					ResumeCollections.WORK_EXPERIENCE,
					index,
				);
			}}
			onMove={async (fromIndex, toIndex) => {
				controller?.moveArrayItem(
					getResumeCollectionPath(ResumeCollections.WORK_EXPERIENCE),
					fromIndex,
					toIndex,
				);
			}}
		>
			{({ items, addItem, removeItem, moveItem, isSaving }) => (
				<Section
					heading="Work History"
					className="work-experience"
					headerActions={
						isEditable ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => void addItem()}
								disabled={isSaving}
							>
								Add job
							</Button>
						) : null
					}
				>
					{items.map((item, index) => (
						<CollectionEditorItem
							key={item._id}
							index={index}
							length={items.length}
							label="job"
							isEditable={isEditable}
							onMove={(fromIndex, toIndex) =>
								void moveItem(fromIndex, toIndex)
							}
							actions={
								isEditable ? (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => void removeItem(index)}
										disabled={isSaving}
									>
										Remove
									</Button>
								) : null
							}
						>
							<JobSection job={item} index={index} />
						</CollectionEditorItem>
					))}
				</Section>
			)}
		</CollectionEditor>
	);
});
