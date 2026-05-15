import { type FC } from 'react';

import { CornerCap } from '../CornerCap.tsx';
import { Page } from '../Page.tsx';
import { useResume } from '../Resume.provider.tsx';
import { CandidateName } from '../sections/CandidateName.tsx';
import { ContactInformationSection } from '../sections/ContactInformationSection.tsx';
import {
	EducationSection,
	ProjectsSection,
	SkillsSection,
	SummarySection,
	WorkExperience,
} from '../sections/index.ts';
import { Column } from './Column.tsx';
import { Layout } from './Layout.tsx';

import './ColumnLayout.css';

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
