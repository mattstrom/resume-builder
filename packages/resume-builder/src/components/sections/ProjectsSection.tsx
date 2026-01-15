import { type FC } from 'react';
import { useResume } from '../Resume.provider.tsx';
import { Section } from './Section.tsx';
import type { ResumeContent } from '@resume-builder/entities';

interface ProjectsSectionProps {}

export const ProjectsSection: FC<ProjectsSectionProps> = () => {
	const { projects } = useResume();
	return (
		<Section heading="Projects" className="projects">
			{projects.map((item, index) => (
				<Project key={index} project={item} />
			))}
		</Section>
	);
};

interface ProjectProps {
	project: ResumeContent['projects'][number];
}

const Project: FC<ProjectProps> = ({ project }) => {
	const technologies = project.technologies.join(', ');

	return (
		<section className="project">
			<header>
				<h3>{project.name}</h3>
			</header>
			<div>{technologies}</div>
			<ul>
				{project.items.map((item, index) => (
					<li key={index}>{item}</li>
				))}
			</ul>
		</section>
	);
};
