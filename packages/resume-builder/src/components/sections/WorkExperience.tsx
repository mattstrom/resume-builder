import { CollectionEditor } from '@/components/CollectionEditor.tsx';
import { ADD_RESUME_COLLECTION_ITEM, REMOVE_RESUME_COLLECTION_ITEM } from '@/graphql/mutations.ts';
import { LIST_RESUMES } from '@/graphql/queries.ts';
import { ResumeCollections } from '@/graphql/resume-collections.ts';
import type {
	AddResumeCollectionItemData,
	AddResumeCollectionItemVariables,
	RemoveResumeCollectionItemData,
	RemoveResumeCollectionItemVariables,
} from '@/graphql/types.ts';
import { Button } from '@/components/ui/button.tsx';
import { useMutation } from '@apollo/client/react';
import type { Job } from '@resume-builder/entities';
import { type FC, type PropsWithChildren } from 'react';
import { Section } from './Section.tsx';
import { useResume, useResumeId } from '../Resume.provider.tsx';
import { JobSection } from './JobSection.tsx';

interface WorkExperienceProps extends PropsWithChildren {}

export const WorkExperience: FC<WorkExperienceProps> = () => {
	const { workExperience } = useResume();
	const resumeId = useResumeId();
	const [addItemMutation, { loading: isAdding }] = useMutation<
		AddResumeCollectionItemData,
		AddResumeCollectionItemVariables
	>(ADD_RESUME_COLLECTION_ITEM, {
		refetchQueries: [{ query: LIST_RESUMES }],
	});
	const [removeItemMutation, { loading: isRemoving }] = useMutation<
		RemoveResumeCollectionItemData,
		RemoveResumeCollectionItemVariables
	>(REMOVE_RESUME_COLLECTION_ITEM, {
		refetchQueries: [{ query: LIST_RESUMES }],
	});
	const isSaving = isAdding || isRemoving;

	return (
		<CollectionEditor<Job>
			items={workExperience}
			isSaving={isSaving}
			onAdd={async () => {
				await addItemMutation({
					variables: {
						id: resumeId,
						input: {
							collection: ResumeCollections.WORK_EXPERIENCE,
						},
					},
				});
			}}
			onRemove={async (index) => {
				await removeItemMutation({
					variables: {
						id: resumeId,
						input: {
							collection: ResumeCollections.WORK_EXPERIENCE,
							index,
						},
					},
				});
			}}
		>
			{({ items, addItem, removeItem, isSaving }) => (
				<Section
					heading="Work History"
					className="work-experience"
					headerActions={
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => void addItem()}
							disabled={isSaving}
						>
							Add job
						</Button>
					}
				>
					{items.map((item, index) => (
						<JobSection
							key={index}
							job={item}
							index={index}
							actions={
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => void removeItem(index)}
									disabled={isSaving}
								>
									Remove
								</Button>
							}
						/>
					))}
				</Section>
			)}
		</CollectionEditor>
	);
};
