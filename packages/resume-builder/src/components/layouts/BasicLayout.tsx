import { type FC } from 'react';

import { PaginatedDocument } from '../pagination/PaginatedDocument.tsx';
import {
	EducationSection,
	Masthead,
	ProjectsSection,
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
				<SummarySection />
				<WorkExperience />
				<EducationSection />
				<SkillsSection />
				<ProjectsSection />
				<VolunteeringSection />
			</PaginatedDocument>
		</Layout>
	);
};
