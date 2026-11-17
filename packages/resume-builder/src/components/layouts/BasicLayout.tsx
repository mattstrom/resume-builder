import { type FC } from 'react';

import { PaginatedDocument } from '../pagination/PaginatedDocument.tsx';
import {
	EducationSection,
	Masthead,
	OrderedSections,
	ProjectsSection,
	SelectedExperienceSection,
	SkillsSection,
	SummarySection,
	VolunteeringSection,
	WorkExperience,
} from '../sections/index.ts';
import { Layout } from './Layout.tsx';

import './BasicLayout.css';

export const BasicLayout: FC = () => {
	return (
		<Layout name="basic">
			<PaginatedDocument>
				<Masthead />
				<OrderedSections
					sections={{
						summary: <SummarySection />,
						'selected-experience': <SelectedExperienceSection />,
						'work-experience': <WorkExperience />,
						education: <EducationSection />,
						skills: <SkillsSection />,
						projects: <ProjectsSection />,
						'volunteer-experiences': <VolunteeringSection />,
					}}
				/>
			</PaginatedDocument>
		</Layout>
	);
};
