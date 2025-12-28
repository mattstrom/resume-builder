import { type FC } from 'react';
import { useResume } from '../Resume.provider.tsx';
import { Section } from './Section.tsx';

interface EducationSectionProps {}

export const EducationSection: FC<EducationSectionProps> = () => {
	const { education } = useResume();

	return (
		<Section heading="Education" className="education">
			{education.map((item, index) => (
				<section key={index}>
					<header className="degree">{item.degree}</header>
					<div className="field">{item.field}</div>
					<div>
						<span className="institution">{item.institution}</span>
						{/*{' | Graduated '}*/}
						{/*<span className="graduated">{item.graduated}</span>*/}
					</div>
				</section>
			))}
		</Section>
	);
};
