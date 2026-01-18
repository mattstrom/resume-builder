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
				<Typography variant="subtitle2">Skills</Typography>
			</AccordionSummary>
			<AccordionDetails sx={{ pt: 2 }}>
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
						<TextField
							fullWidth
							label="Name"
							value={skill.name}
							onChange={handleChange(index, 'name')}
							size="small"
							sx={{ mb: 2 }}
							InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)' } }}
							InputProps={{ sx: { color: 'white' } }}
						/>
						<TextField
							fullWidth
							label="Category"
							value={skill.category}
							onChange={handleChange(index, 'category')}
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
					Add Skill
				</Button>
			</AccordionDetails>
		</Accordion>
	);
};
