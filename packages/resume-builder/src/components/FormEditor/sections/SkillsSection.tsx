import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { type ChangeEvent, type FC, useState } from 'react';
import { ExpandableCard } from '../components/ExpandableCard';

interface Skill {
	name: string;
	category: string;
}

interface SkillsSectionProps {
	skills: Skill[];
	onChange: (skills: Skill[]) => void;
}

export const SkillsSection: FC<SkillsSectionProps> = ({ skills, onChange }) => {
	const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

	const handleAdd = () => {
		onChange([...skills, { name: '', category: '' }]);
		setExpandedIndex(skills.length);
	};

	const handleDelete = (index: number) => {
		onChange(skills.filter((_, i) => i !== index));
		if (expandedIndex === index) {
			setExpandedIndex(null);
		}
	};

	const handleChange = (index: number, field: keyof Skill) => (
		e: ChangeEvent<HTMLInputElement>,
	) => {
		const newSkills = [...skills];
		newSkills[index][field] = e.target.value;
		onChange(newSkills);
	};

	const formatSkillTitle = (skill: Skill) =>
		`${skill.name || 'New Skill'} ${skill.category ? `(${skill.category})` : ''}`;

	return (
		<Accordion type="single" collapsible>
			<AccordionItem value="skills" className="bg-card/5 border-white/10 px-4">
				<AccordionTrigger className="text-sm hover:no-underline">
					Skills
				</AccordionTrigger>
				<AccordionContent className="pt-4 space-y-4">
					{skills.map((skill, index) => (
						<ExpandableCard
							key={index}
							title={formatSkillTitle(skill)}
							expanded={expandedIndex === index}
							onExpandChange={() =>
								setExpandedIndex(expandedIndex === index ? null : index)
							}
							onDelete={() => handleDelete(index)}
						>
							<div className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor={`skill-name-${index}`}>Name</Label>
									<Input
										id={`skill-name-${index}`}
										value={skill.name}
										onChange={handleChange(index, 'name')}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor={`skill-category-${index}`}>Category</Label>
									<Input
										id={`skill-category-${index}`}
										value={skill.category}
										onChange={handleChange(index, 'category')}
									/>
								</div>
							</div>
						</ExpandableCard>
					))}
					<Button onClick={handleAdd} variant="outline" size="sm" className="mt-4">
						<Plus className="h-4 w-4 mr-2" />
						Add Skill
					</Button>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
};
