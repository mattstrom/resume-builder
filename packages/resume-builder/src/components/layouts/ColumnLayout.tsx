import { type FC } from 'react';
import { Layout } from './Layout.tsx';
import { Page } from '../Page.tsx';
import {
	EducationSection,
	Masthead,
	ProjectsSection,
	SkillsSection,
	SummarySection,
	WorkExperience,
} from '../sections';

import './ColumnLayout.css';
import { Column } from './Column.tsx';

interface ColumnLayoutProps {}

export const ColumnLayout: FC<ColumnLayoutProps> = () => {
	return (
		<Layout name="column">
			<Page>
				<Column className="left">
					<Masthead />
					<EducationSection />
					<SkillsSection />
				</Column>
				<Column className="right">
					<SummarySection />
					<WorkExperience />
				</Column>
			</Page>
			<Page>
				<ProjectsSection />
			</Page>
		</Layout>
	);
};
