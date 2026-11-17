import { type FC } from 'react';

import { Page } from '../Page.tsx';
import {
	CandidateName,
	ContactInformationSection,
	EducationSection,
	OrderedSections,
	ProjectsSection,
	SelectedExperienceSection,
	SkillsSection,
	SummarySection,
	WorkExperience,
} from '../sections';
import { Layout } from './Layout.tsx';

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
					<OrderedSections
						sections={{
							education: <EducationSection />,
							skills: <SkillsSection />,
						}}
					/>
				</div>
				<div className="bottom-right">
					<OrderedSections
						sections={{
							'selected-experience': <SelectedExperienceSection />,
							'work-experience': <WorkExperience />,
						}}
					/>
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
