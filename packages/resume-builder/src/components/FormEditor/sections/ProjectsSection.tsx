import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Button,
	TextField,
	Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { type ChangeEvent, type FC, useState } from 'react';
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

	const handleChange = (index: number, field: keyof Project) => (
		e: ChangeEvent<HTMLInputElement>,
	) => {
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
		<Accordion
			sx={{
				backgroundColor: 'rgba(255, 255, 255, 0.05)',
				color: 'white',
				'&:before': { display: 'none' },
			}}
		>
			<AccordionSummary
				expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
				sx={{
					borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
				}}
			>
				<Typography variant="subtitle2">Projects</Typography>
			</AccordionSummary>
			<AccordionDetails sx={{ pt: 2 }}>
				{projects.map((project, index) => (
					<ExpandableCard
						key={index}
						title={formatProjectTitle(project)}
						expanded={expandedIndex === index}
						onExpandChange={() =>
							setExpandedIndex(expandedIndex === index ? null : index)
						}
						onDelete={() => handleDelete(index)}
					>
						<TextField
							fullWidth
							label="Name"
							value={project.name}
							onChange={handleChange(index, 'name')}
							size="small"
							sx={{ mb: 2 }}
							InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)' } }}
							InputProps={{ sx: { color: 'white' } }}
						/>
						<TextField
							fullWidth
							label="Technologies (comma-separated)"
							value={project.technologies.join(', ')}
							onChange={handleChange(index, 'technologies')}
							size="small"
							sx={{ mb: 2 }}
							InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)' } }}
							InputProps={{ sx: { color: 'white' } }}
						/>
						<TextField
							fullWidth
							label="Items (one per line)"
							value={project.items.join('\n')}
							onChange={handleChange(index, 'items')}
							multiline
							rows={5}
							size="small"
							InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)' } }}
							InputProps={{ sx: { color: 'white' } }}
						/>
					</ExpandableCard>
				))}
				<Button
					startIcon={<AddIcon />}
					onClick={handleAdd}
					variant="outlined"
					size="small"
					sx={{ mt: 2 }}
				>
					Add Project
				</Button>
			</AccordionDetails>
		</Accordion>
	);
};
