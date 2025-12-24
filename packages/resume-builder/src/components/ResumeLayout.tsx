import { type FC } from 'react';

import { Page } from './Page.tsx';
import { Masthead } from './Masthead.tsx';
import { SummarySection } from './SummarySection.tsx';
import { WorkExperience } from './WorkExperience.tsx';
import { EducationSection } from './EducationSection.tsx';
import { SkillsSection } from './SkillsSection.tsx';
import { ProjectsSection } from './ProjectsSection.tsx';

export const ResumeLayout: FC = () => {
	return (
		<article className="resume">
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
		</article>
	);
};
