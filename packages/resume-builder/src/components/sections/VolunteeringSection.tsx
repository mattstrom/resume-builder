import { CollectionEditorItem } from '@/components/CollectionEditorItem.tsx';
import { CollectionEditor } from '@/components/CollectionEditor.tsx';
import {
	getResumeCollectionPath,
	ResumeCollections,
} from '@/graphql/resume-collections.ts';
import { Button } from '@/components/ui/button.tsx';
import { getActiveResumeController } from '@/lib/active-resume-controller.ts';
import { useStore } from '@/stores/store.provider.tsx';
import type { Volunteering } from '@resume-builder/entities';
import { type FC, type PropsWithChildren } from 'react';
import { observer } from 'mobx-react';
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

export const VolunteeringSection: FC<VolunteeringSectionProps> = observer(
	() => {
		const { volunteering } = useResume();
		const resumeId = useResumeId();
		const { uiStateStore } = useStore();
		const isEditable = uiStateStore.isResumeEditable;
		const controller = getActiveResumeController(resumeId);
		const isSaving = false;

		if (!volunteering || volunteering.length === 0) {
			return (
				<CollectionEditor<Volunteering>
					items={[]}
					isSaving={isSaving}
					isEditable={isEditable}
					onAdd={async () => {
						controller?.addCollectionItem(
							ResumeCollections.VOLUNTEERING,
						);
					}}
					onRemove={async () => {}}
					onMove={async () => {}}
				>
					{({ addItem, isSaving }) => (
						<Section
							heading="Volunteering"
							className="volunteering"
							headerActions={
								isEditable ? (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => void addItem()}
										disabled={isSaving}
									>
										Add role
									</Button>
								) : null
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
				isEditable={isEditable}
				onAdd={async () => {
					controller?.addCollectionItem(
						ResumeCollections.VOLUNTEERING,
					);
				}}
				onRemove={async (index) => {
					controller?.removeCollectionItem(
						ResumeCollections.VOLUNTEERING,
						index,
					);
				}}
				onMove={async (fromIndex, toIndex) => {
					controller?.moveArrayItem(
						getResumeCollectionPath(ResumeCollections.VOLUNTEERING),
						fromIndex,
						toIndex,
					);
				}}
			>
				{({ items, addItem, removeItem, moveItem, isSaving }) => (
					<Section
						heading="Volunteering"
						className="volunteering"
						headerActions={
							isEditable ? (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => void addItem()}
									disabled={isSaving}
								>
									Add role
								</Button>
							) : null
						}
					>
						{items.map((item, index) => (
							<CollectionEditorItem
								key={item._id}
								index={index}
								length={items.length}
								label="role"
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
											onClick={() =>
												void removeItem(index)
											}
											disabled={isSaving}
										>
											Remove
										</Button>
									) : null
								}
							>
								<VolunteeringPosition
									volunteering={item}
									index={index}
								/>
							</CollectionEditorItem>
						))}
					</Section>
				)}
			</CollectionEditor>
		);
	},
);

interface VolunteeringProps extends PropsWithChildren {
	volunteering: Volunteering;
	index: number;
}

const VolunteeringPosition: FC<VolunteeringProps> = ({
	volunteering,
	index,
}) => {
	const resumeId = useResumeId();

	return (
		<section className="volunteering">
			<header className="flex items-start gap-2">
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
