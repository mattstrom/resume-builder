import { type FC } from 'react';
import { Layout } from './Layout.tsx';
import { Page } from '../Page.tsx';
import {
	CandidateName,
	ContactInformationSection,
	EducationSection,
	ProjectsSection,
	SkillsSection,
	SummarySection,
	WorkExperience,
} from '../sections';

import './GridLayout.css';

interface GridLayoutProps {}

export const GridLayout: FC<GridLayoutProps> = () => {
	return (
		<Layout name="grid">
			<Page>
				<div className="top-left">
					<CandidateName />
					<ContactInformationSection />
				</div>
				<div className="top-right">
					<SummarySection />
				</div>
				<div className="bottom-left">
					<EducationSection />
					<SkillsSection />
				</div>
				<div className="bottom-right">
					<WorkExperience />
				</div>
			</Page>
			<Page>
				<div className="top-left"></div>
				<div className="top-right"></div>
				<div className="bottom-left"></div>
				<div className="bottom-right">
					<ProjectsSection />
				</div>
			</Page>
		</Layout>
	);
};
