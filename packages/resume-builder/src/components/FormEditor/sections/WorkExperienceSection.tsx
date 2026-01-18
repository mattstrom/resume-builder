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

interface Job {
	company: string;
	position: string;
	location: string;
	startDate: string;
	endDate?: string;
	responsibilities: string[];
}

interface WorkExperienceSectionProps {
	jobs: Job[];
	onChange: (jobs: Job[]) => void;
}

export const WorkExperienceSection: FC<WorkExperienceSectionProps> = ({
	jobs,
	onChange,
}) => {
	const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

	const handleAdd = () => {
		onChange([
			...jobs,
			{
				company: '',
				position: '',
				location: '',
				startDate: '',
				endDate: '',
				responsibilities: [],
			},
		]);
		setExpandedIndex(jobs.length);
	};

	const handleDelete = (index: number) => {
		onChange(jobs.filter((_, i) => i !== index));
		if (expandedIndex === index) {
			setExpandedIndex(null);
		}
	};

	const handleChange = (index: number, field: keyof Job) => (
		e: ChangeEvent<HTMLInputElement>,
	) => {
		const newJobs = [...jobs];
		if (field === 'responsibilities') {
			newJobs[index][field] = e.target.value
				.split('\n')
				.filter((line) => line.trim());
		} else {
			newJobs[index][field] = e.target.value as any;
		}
		onChange(newJobs);
	};

	const formatJobTitle = (job: Job) => {
		const dates = job.endDate
			? `${job.startDate} - ${job.endDate}`
			: job.startDate
				? `${job.startDate} - Present`
				: '';
		return `${job.position || 'New Position'} at ${job.company || 'Company'} ${dates ? `(${dates})` : ''}`;
	};

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
				<Typography variant="subtitle2">Work Experience</Typography>
			</AccordionSummary>
			<AccordionDetails sx={{ pt: 2 }}>
				{jobs.map((job, index) => (
					<ExpandableCard
						key={index}
						title={formatJobTitle(job)}
						expanded={expandedIndex === index}
						onExpandChange={() =>
							setExpandedIndex(expandedIndex === index ? null : index)
						}
						onDelete={() => handleDelete(index)}
					>
						<TextField
							fullWidth
							label="Company"
							value={job.company}
							onChange={handleChange(index, 'company')}
							size="small"
							sx={{ mb: 2 }}
							InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)' } }}
							InputProps={{ sx: { color: 'white' } }}
						/>
						<TextField
							fullWidth
							label="Position"
							value={job.position}
							onChange={handleChange(index, 'position')}
							size="small"
							sx={{ mb: 2 }}
							InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)' } }}
							InputProps={{ sx: { color: 'white' } }}
						/>
						<TextField
							fullWidth
							label="Location"
							value={job.location}
							onChange={handleChange(index, 'location')}
							size="small"
							sx={{ mb: 2 }}
							InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)' } }}
							InputProps={{ sx: { color: 'white' } }}
						/>
						<TextField
							fullWidth
							label="Start Date"
							value={job.startDate}
							onChange={handleChange(index, 'startDate')}
							size="small"
							sx={{ mb: 2 }}
							InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)' } }}
							InputProps={{ sx: { color: 'white' } }}
						/>
						<TextField
							fullWidth
							label="End Date"
							value={job.endDate || ''}
							onChange={handleChange(index, 'endDate')}
							size="small"
							sx={{ mb: 2 }}
							InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)' } }}
							InputProps={{ sx: { color: 'white' } }}
						/>
						<TextField
							fullWidth
							label="Responsibilities (one per line)"
							value={job.responsibilities.join('\n')}
							onChange={handleChange(index, 'responsibilities')}
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
					Add Job
				</Button>
			</AccordionDetails>
		</Accordion>
	);
};
