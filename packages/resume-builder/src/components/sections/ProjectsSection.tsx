import { CollectionEditorItem } from '@/components/CollectionEditorItem.tsx';
import { CollectionEditor } from '@/components/CollectionEditor.tsx';
import { InlineEditor } from '@/components/InlineEditor.tsx';
import { ListEditor } from '@/components/ListEditor.tsx';
import {
	getResumeCollectionPath,
	ResumeCollections,
} from '@/graphql/resume-collections.ts';
import { Button } from '@/components/ui/button.tsx';
import { getActiveResumeController } from '@/lib/active-resume-controller.ts';
import { useStore } from '@/stores/store.provider.tsx';
import { type FC } from 'react';
import { observer } from 'mobx-react';
import { useResume, useResumeId } from '../Resume.provider.tsx';
import { Section } from './Section.tsx';
import type { Project, ResumeContent } from '@resume-builder/entities';

interface ProjectsSectionProps {}

export const ProjectsSection: FC<ProjectsSectionProps> = observer(() => {
	const { projects } = useResume();
	const resumeId = useResumeId();
	const { uiStateStore } = useStore();
	const isEditable = uiStateStore.isResumeEditable;
	const controller = getActiveResumeController(resumeId);
	const isSaving = false;

	return (
		<CollectionEditor<Project>
			items={projects}
			isSaving={isSaving}
			isEditable={isEditable}
			onAdd={async () => {
				controller?.addCollectionItem(ResumeCollections.PROJECTS);
			}}
			onRemove={async (index) => {
				controller?.removeCollectionItem(
					ResumeCollections.PROJECTS,
					index,
				);
			}}
			onMove={async (fromIndex, toIndex) => {
				controller?.moveArrayItem(
					getResumeCollectionPath(ResumeCollections.PROJECTS),
					fromIndex,
					toIndex,
				);
			}}
		>
			{({ items, addItem, removeItem, moveItem, isSaving }) => (
				<Section
					heading="Projects"
					className="projects"
					headerActions={
						isEditable ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => void addItem()}
								disabled={isSaving}
							>
								Add project
							</Button>
						) : null
					}
				>
					{items.map((item, index) => (
						<CollectionEditorItem
							key={item._id}
							index={index}
							length={items.length}
							label="project"
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
							<ProjectSection project={item} index={index} />
						</CollectionEditorItem>
					))}
				</Section>
			)}
		</CollectionEditor>
	);
});

interface ProjectProps {
	project: ResumeContent['projects'][number];
	index: number;
}

const ProjectSection: FC<ProjectProps> = ({ project, index }) => {
	const resumeId = useResumeId();

	return (
		<section className="project">
			<header className="flex items-center gap-2">
				<InlineEditor
					as="h3"
					path={`data.projects.${index}.name`}
					value={project.name}
					resumeId={resumeId}
				/>
			</header>
			<ListEditor
				path={`data.projects.${index}.technologies`}
				items={project.technologies}
				resumeId={resumeId}
				variant="inline"
			/>
			<ListEditor
				path={`data.projects.${index}.items`}
				items={project.items}
				resumeId={resumeId}
				variant="block"
			/>
		</section>
	);
};
