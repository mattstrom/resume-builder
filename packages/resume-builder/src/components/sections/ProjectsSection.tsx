import { InlineEditor } from '@/components/InlineEditor.tsx';
import { ListEditor } from '@/components/ListEditor.tsx';
import { type FC } from 'react';
import { useResume, useResumeId } from '../Resume.provider.tsx';
import { Section } from './Section.tsx';
import type { ResumeContent } from '@resume-builder/entities';

interface ProjectsSectionProps {}

export const ProjectsSection: FC<ProjectsSectionProps> = () => {
	const { projects } = useResume();

	return (
		<Section heading="Projects" className="projects">
			{projects.map((item, index) => (
				<Project key={index} project={item} index={index} />
			))}
		</Section>
	);
};

interface ProjectProps {
	project: ResumeContent['projects'][number];
	index: number;
}

const Project: FC<ProjectProps> = ({ project, index }) => {
	const resumeId = useResumeId();

	return (
		<section className="project">
			<header>
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
