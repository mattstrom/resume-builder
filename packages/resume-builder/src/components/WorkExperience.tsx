import { type FC, type PropsWithChildren } from 'react';
import { Section } from './Section.tsx';
import { useResume } from './Resume.provider.tsx';
import { JobSection } from './JobSection.tsx';

interface WorkExperienceProps extends PropsWithChildren {}

export const WorkExperience: FC<WorkExperienceProps> = () => {
	const { workExperience } = useResume();

	return (
		<Section heading="Work Experience" className="work-experience">
			{workExperience.map((item, index) => (
				<JobSection key={index} job={item} />
			))}
		</Section>
	);
};
