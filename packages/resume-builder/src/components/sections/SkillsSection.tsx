import { type FC, Fragment } from 'react';
import { Section } from './Section.tsx';
import { useResume } from '../Resume.provider.tsx';

interface SkillsSectionProps {}

export const SkillsSection: FC<SkillsSectionProps> = () => {
	const { skills } = useResume();

	return (
		<Section heading="Skills" className="skills">
			<dfn>
				{skills.map((group, index) => (
					<Fragment key={index}>
						<dt>{group.name}: </dt>
						<dd>{group.items.join(', ')}</dd>
					</Fragment>
				))}
			</dfn>
		</Section>
	);
};
