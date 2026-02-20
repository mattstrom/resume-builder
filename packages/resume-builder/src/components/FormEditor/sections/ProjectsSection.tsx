import { type ChangeEvent, type FC, useState } from 'react';
import { Plus } from 'lucide-react';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ExpandableCard } from '../components/ExpandableCard';

interface Project {
	name: string;
	technologies: string[];
	items: string[];
}

interface ProjectsSectionProps {
	projects: Project[];
	onChange: (projects: Project[]) => void;
}

export const ProjectsSection: FC<ProjectsSectionProps> = ({
	projects,
	onChange,
}) => {
	const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

	const handleAdd = () => {
		onChange([...projects, { name: '', technologies: [], items: [] }]);
		setExpandedIndex(projects.length);
	};

	const handleDelete = (index: number) => {
		onChange(projects.filter((_, i) => i !== index));
		if (expandedIndex === index) {
			setExpandedIndex(null);
		}
	};

	const handleChange =
		(index: number, field: keyof Project) =>
		(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			const newProjects = [...projects];
			if (field === 'technologies') {
				newProjects[index][field] = e.target.value
					.split(',')
					.map((t) => t.trim())
					.filter((t) => t);
			} else if (field === 'items') {
				newProjects[index][field] = e.target.value
					.split('\n')
					.filter((line) => line.trim());
			} else {
				newProjects[index][field] = e.target.value as any;
			}
			onChange(newProjects);
		};

	const formatProjectTitle = (project: Project) =>
		project.name || 'New Project';

	return (
		<Accordion type="single" collapsible>
			<AccordionItem
				value="projects"
				className="bg-card/5 border-white/10 px-4"
			>
				<AccordionTrigger className="text-sm hover:no-underline">
					Projects
				</AccordionTrigger>
				<AccordionContent className="pt-4 space-y-4">
					{projects.map((project, index) => (
						<ExpandableCard
							key={index}
							title={formatProjectTitle(project)}
							expanded={expandedIndex === index}
							onExpandChange={() =>
								setExpandedIndex(
									expandedIndex === index ? null : index,
								)
							}
							onDelete={() => handleDelete(index)}
						>
							<div className="space-y-2">
								<Label htmlFor={`name-${index}`}>Name</Label>
								<Input
									id={`name-${index}`}
									value={project.name}
									onChange={handleChange(index, 'name')}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor={`technologies-${index}`}>
									Technologies (comma-separated)
								</Label>
								<Input
									id={`technologies-${index}`}
									value={project.technologies.join(', ')}
									onChange={handleChange(
										index,
										'technologies',
									)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor={`items-${index}`}>
									Items (one per line)
								</Label>
								<Textarea
									id={`items-${index}`}
									value={project.items.join('\n')}
									onChange={handleChange(index, 'items')}
									rows={5}
								/>
							</div>
						</ExpandableCard>
					))}
					<Button
						onClick={handleAdd}
						variant="outline"
						size="sm"
						className="mt-4"
					>
						<Plus className="w-4 h-4 mr-2" />
						Add Project
					</Button>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
};
