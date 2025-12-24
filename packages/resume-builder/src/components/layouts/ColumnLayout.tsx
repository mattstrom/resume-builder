import { type FC } from 'react';
import { Layout } from './Layout.tsx';
import { Page } from '../Page.tsx';
import {
	EducationSection,
	ProjectsSection,
	SkillsSection,
	SummarySection,
	WorkExperience,
} from '../sections';

import './ColumnLayout.css';
import { Column } from './Column.tsx';
import { ContactInformationSection } from '../sections/ContactInformationSection.tsx';
import { CornerCap } from '../CornerCap.tsx';
import { CandidateName } from '../sections/CandidateName.tsx';
import { useResume } from '../Resume.provider.tsx';

interface ColumnLayoutProps {}

export const ColumnLayout: FC<ColumnLayoutProps> = () => {
	const { title } = useResume();

	return (
		<Layout name="column">
			<Page>
				<Column className="left">
					<CornerCap>
						<section>
							<header>
								<CandidateName />
							</header>
							<div>{title}</div>
							<ContactInformationSection />
						</section>
					</CornerCap>
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
