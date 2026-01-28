import { type FC } from 'react';

import { Page } from '../Page.tsx';
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
			<Page>
				<Masthead />
				<SummarySection />
				<WorkExperience />
				<EducationSection />
				<SkillsSection />
			</Page>
			<Page>
				<ProjectsSection />
				<VolunteeringSection />
			</Page>
		</Layout>
	);
};
