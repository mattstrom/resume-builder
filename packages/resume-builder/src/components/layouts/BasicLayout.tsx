import { type FC } from 'react';

import { Page } from '../Page.tsx';
import {
	EducationSection,
	Masthead,
	ProjectsSection,
	SkillsSection,
	SummarySection,
	WorkExperience,
} from '../sections/index.ts';
import { Layout } from './Layout.tsx';

import './BasicLayout.css';

export const BasicLayout: FC = () => {
	return (
		<Layout name='basic'>
			<Page>
				<Masthead />
				<SummarySection />
				<WorkExperience />
				<EducationSection />
				<SkillsSection />
			</Page>
			<Page>
				<ProjectsSection />
			</Page>
		</Layout>
	);
};
