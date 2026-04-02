import { LookupFieldEditor } from '@/components/LookupFieldEditor.tsx';
import { LIST_EDUCATIONS } from '@/graphql/queries.ts';
import { useQuery } from '@apollo/client/react';
import { type FC } from 'react';
import { useResume, useResumeId } from '../Resume.provider.tsx';
import { Section } from './Section.tsx';
import type { Education } from '@resume-builder/entities';

interface EducationSectionProps {}

export const EducationSection: FC<EducationSectionProps> = () => {
	const { education } = useResume();
	const resumeId = useResumeId();
	const { data } = useQuery<{ listEducations: Education[] }>(LIST_EDUCATIONS, {
		fetchPolicy: 'network-only',
	});
	const options = data?.listEducations ?? [];

	return (
		<Section heading="Education" className="education">
			{education.map((item, index) => (
				<LookupFieldEditor<Education, Education>
					key={index}
					as="section"
					path={`data.education.${index}`}
					value={item}
					resumeId={resumeId}
					options={options}
					placeholder="Select education"
					getOptionKey={(option) => option._id}
					mapOptionToValue={(option, currentValue) => ({
						...currentValue,
						degree: option.degree,
						field: option.field,
						institution: option.institution,
						graduated: option.graduated,
					})}
					renderDisplay={(educationItem) => (
						<>
							<header className="degree">
								{educationItem.degree}
							</header>
							<div className="field">{educationItem.field}</div>
							<div>
								<span className="institution">
									{educationItem.institution}
								</span>
							</div>
						</>
					)}
					renderOption={(option) => (
						<>
							{option.degree} in {option.field} -{' '}
							{option.institution}
						</>
					)}
				/>
			))}
		</Section>
	);
};
