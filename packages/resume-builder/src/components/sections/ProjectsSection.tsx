import type { Project, ResumeContent } from '@resume-builder/entities';
import { Trash2 } from 'lucide-react';
import { observer } from 'mobx-react';
import { type FC } from 'react';

import { AddItemGhostRow } from '@/components/AddItemGhostRow.tsx';
import { CollectionEditor } from '@/components/CollectionEditor.tsx';
import { CollectionEditorItem } from '@/components/CollectionEditorItem.tsx';
import { InlineEditor } from '@/components/InlineEditor.tsx';
import { ListEditor } from '@/components/ListEditor.tsx';
import { Button } from '@/components/ui/button.tsx';
import { getResumeCollectionPath, ResumeCollections } from '@/graphql/resume-collections.ts';
import { getActiveResumeController } from '@/lib/active-resume-controller.ts';
import { useStore } from '@/stores/store.provider.tsx';

import { useResume, useResumeId } from '../Resume.provider.tsx';
import { getProjectAnchorId, RESUME_SECTION_IDS } from './section-anchors.ts';
import { Section } from './Section.tsx';

interface ProjectsSectionProps {}

export const ProjectsSection: FC<ProjectsSectionProps> = observer(() => {
	const { projects } = useResume();
	const items = projects ?? [];
	const resumeId = useResumeId();
	const { uiStateStore } = useStore();
	const isEditable = uiStateStore.isResumeEditable;
	const controller = getActiveResumeController(resumeId);
	const isSaving = false;

	return (
		<CollectionEditor<Project>
			path="data.projects"
			label="Projects"
			items={items}
			isSaving={isSaving}
			isEditable={isEditable}
			onAdd={async () => {
				controller?.addCollectionItem(ResumeCollections.PROJECTS);
			}}
			onInsert={async (index) => {
				controller?.insertCollectionItem(ResumeCollections.PROJECTS, index);
			}}
			onRemove={async (index) => {
				controller?.removeCollectionItem(ResumeCollections.PROJECTS, index);
			}}
			onMove={async (fromIndex, toIndex) => {
				controller?.moveArrayItem(
					getResumeCollectionPath(ResumeCollections.PROJECTS),
					fromIndex,
					toIndex,
				);
			}}
		>
			{({ items, insertItem, removeItem, moveItem, isSaving }) => (
				<Section
					heading="Projects"
					className="projects"
					anchorId={RESUME_SECTION_IDS.projects}
				>
					{items.length === 0 && isEditable ? (
						<AddItemGhostRow
							label="project"
							onAdd={() => void insertItem(0)}
							disabled={isSaving}
						/>
					) : (
						items.map((item, index) => (
							<CollectionEditorItem
								key={item._id}
								index={index}
								length={items.length}
								label="project"
								path={`data.projects.${index}`}
								paginationUnit={`project-${item._id ?? index}`}
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
											aria-label="Remove project"
											title="Remove project"
										>
											<Trash2 />
										</Button>
									) : null
								}
							>
								<ProjectSection project={item} index={index} />
							</CollectionEditorItem>
						))
					)}
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
	const anchorId = getProjectAnchorId(project._id, index);

	return (
		<section id={anchorId} data-link-target={`#${anchorId}`} className="project">
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
				linkMarkup
			/>
		</section>
	);
};
