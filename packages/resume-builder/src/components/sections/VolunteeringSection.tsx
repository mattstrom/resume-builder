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
import type { Volunteering } from '@resume-builder/entities';
import { type FC, type PropsWithChildren, type ReactNode } from 'react';
import { InlineEditor } from '@/components/InlineEditor.tsx';
import { ListEditor } from '@/components/ListEditor.tsx';
import { useResume, useResumeId } from '../Resume.provider.tsx';
import { Section } from './Section.tsx';

function formatDate(dateString: string): string {
	if (!dateString) {
		return 'Date TBD';
	}

	const date = new Date(dateString);

	if (Number.isNaN(date.getTime())) {
		return dateString;
	}

	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		timeZone: 'UTC',
	});
}

interface VolunteeringSectionProps {}

export const VolunteeringSection: FC<VolunteeringSectionProps> = () => {
	const { volunteering } = useResume();
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

	if (!volunteering || volunteering.length === 0) {
		return (
			<CollectionEditor<Volunteering>
				items={[]}
				isSaving={isSaving}
				onAdd={async () => {
					await addItemMutation({
						variables: {
							id: resumeId,
							input: {
								collection: ResumeCollections.VOLUNTEERING,
							},
						},
					});
				}}
				onRemove={async () => {}}
			>
				{({ addItem, isSaving }) => (
					<Section
						heading="Volunteering"
						className="volunteering"
						headerActions={
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => void addItem()}
								disabled={isSaving}
							>
								Add role
							</Button>
						}
					/>
				)}
			</CollectionEditor>
		);
	}

	return (
		<CollectionEditor<Volunteering>
			items={volunteering}
			isSaving={isSaving}
			onAdd={async () => {
				await addItemMutation({
					variables: {
							id: resumeId,
							input: {
								collection: ResumeCollections.VOLUNTEERING,
							},
						},
					});
			}}
			onRemove={async (index) => {
				await removeItemMutation({
					variables: {
						id: resumeId,
						input: {
							collection: ResumeCollections.VOLUNTEERING,
							index,
						},
					},
				});
			}}
		>
			{({ items, addItem, removeItem, isSaving }) => (
				<Section
					heading="Volunteering"
					className="volunteering"
					headerActions={
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => void addItem()}
							disabled={isSaving}
						>
							Add role
						</Button>
					}
				>
					{items.map((item, index) => (
						<VolunteeringPosition
							key={index}
							volunteering={item}
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

interface VolunteeringProps extends PropsWithChildren {
	volunteering: Volunteering;
	index: number;
	actions?: ReactNode;
}

const VolunteeringPosition: FC<VolunteeringProps> = ({
	volunteering,
	index,
	actions,
}) => {
	const resumeId = useResumeId();

	return (
		<section className="volunteering">
			<header className="flex items-start justify-between gap-2">
				<div>
					<InlineEditor
						as="h3"
						path={`data.volunteering.${index}.position`}
						value={volunteering.position}
						resumeId={resumeId}
					/>
					<span>{' | '}</span>
					<time>
						<span className="start-date">
							{formatDate(volunteering.startDate)}
						</span>
						{'–'}
						<span className="end-date">
							{volunteering.endDate
								? formatDate(volunteering.endDate)
								: 'Present'}
						</span>
					</time>
				</div>
				{actions}
			</header>
			{volunteering.responsibilities && (
				<ListEditor
					path={`data.volunteering.${index}.responsibilities`}
					items={volunteering.responsibilities}
					resumeId={resumeId}
					variant="block"
					className="responsibilities"
				/>
			)}
		</section>
	);
};
