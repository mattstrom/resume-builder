import { InlineEditor } from '@/components/InlineEditor.tsx';
import { type FC } from 'react';
import { useResume, useResumeId } from '../Resume.provider.tsx';
import { Section } from './Section.tsx';

interface EducationSectionProps {}

export const EducationSection: FC<EducationSectionProps> = () => {
	const { education } = useResume();
	const resumeId = useResumeId();

	return (
		<Section heading="Education" className="education">
			{education.map((item, index) => (
				<section key={index}>
					<InlineEditor
						as="header"
						className="degree"
						path={`data.education.${index}.degree`}
						value={item.degree}
						resumeId={resumeId}
					/>
					<InlineEditor
						as="div"
						className="field"
						path={`data.education.${index}.field`}
						value={item.field}
						resumeId={resumeId}
					/>
					<div>
						<InlineEditor
							path={`data.education.${index}.institution`}
							value={item.institution}
							resumeId={resumeId}
							className="institution"
						/>
						{/*{' | Graduated '}*/}
						{/*<span className="graduated">{item.graduated}</span>*/}
					</div>
				</section>
			))}
		</Section>
	);
};
