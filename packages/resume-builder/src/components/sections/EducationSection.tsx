import { useQuery } from '@apollo/client/react';
import type { Education } from '@resume-builder/entities';
import { type FC } from 'react';

import { HighlightRegion } from '@/components/HighlightRegion.tsx';
import { LookupFieldEditor } from '@/components/LookupFieldEditor.tsx';
import { LIST_EDUCATIONS } from '@/graphql/queries.ts';

import { useResume, useResumeId } from '../Resume.provider.tsx';
import { RESUME_SECTION_IDS } from './section-anchors.ts';
import { Section } from './Section.tsx';

interface EducationSectionProps {}

export const EducationSection: FC<EducationSectionProps> = () => {
	const { education } = useResume();
	const items = education ?? [];
	const resumeId = useResumeId();
	const { data } = useQuery<{ listEducations: Education[] }>(LIST_EDUCATIONS, {
		fetchPolicy: 'network-only',
	});
	const options = data?.listEducations ?? [];

	return (
		<Section
			heading="Education"
			className="education"
			path="data.education"
			label="Education"
			anchorId={RESUME_SECTION_IDS.education}
		>
			{items.map((item, index) => (
				<HighlightRegion
					key={index}
					path={`data.education.${index}`}
					label={`Education ${index + 1}`}
				>
					<div data-pagination-unit={`education-${item._id ?? index}`}>
						<LookupFieldEditor<Education, Education>
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
									<header className="degree">{educationItem.degree}</header>
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
									{option.degree} in {option.field} - {option.institution}
								</>
							)}
						/>
					</div>
				</HighlightRegion>
			))}
		</Section>
	);
};
