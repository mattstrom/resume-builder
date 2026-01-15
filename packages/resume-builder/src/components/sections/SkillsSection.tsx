import { type FC, Fragment } from 'react';
import { Section } from './Section.tsx';
import { useResume } from '../Resume.provider.tsx';
import type { Skill, SkillGroup } from '../../types.ts';

interface SkillsSectionProps {}

export const SkillsSection: FC<SkillsSectionProps> = () => {
	const { skills, skillGroups } = useResume();

	// Prefer skillGroups if available
	if (skillGroups && skillGroups.length > 0) {
		return (
			<Section heading="Skills" className="skills">
				<dfn>
					{skillGroups.map((group: SkillGroup, index: number) => (
						<Fragment key={index}>
							<dt>{group.name}: </dt>
							<dd>{group.items.join(', ')}</dd>
						</Fragment>
					))}
				</dfn>
			</Section>
		);
	}

	// Fall back to skills and group by category
	if (skills && skills.length > 0) {
		// Group skills by category
		const groupedSkills = skills.reduce(
			(acc: Record<string, string[]>, skill: Skill) => {
				const category = skill.category || 'Other';
				if (!acc[category]) {
					acc[category] = [];
				}
				acc[category].push(skill.name);
				return acc;
			},
			{} as Record<string, string[]>,
		);

		return (
			<Section heading="Skills" className="skills">
				<dfn>
					{Object.entries(groupedSkills).map(
						([category, names]: [string, string[]], index: number) => (
							<Fragment key={index}>
								<dt>{category}: </dt>
								<dd>{names.join(', ')}</dd>
							</Fragment>
						),
					)}
				</dfn>
			</Section>
		);
	}

	return null;
};
