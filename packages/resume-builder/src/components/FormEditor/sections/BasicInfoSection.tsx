import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	TextField,
	Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { type ChangeEvent, type FC } from 'react';

interface BasicInfo {
	name: string;
	title: string;
	summary: string;
}

interface BasicInfoSectionProps {
	data: BasicInfo;
	onChange: (data: BasicInfo) => void;
}

export const BasicInfoSection: FC<BasicInfoSectionProps> = ({
	data,
	onChange,
}) => {
	const handleChange = (field: keyof BasicInfo) => (
		e: ChangeEvent<HTMLInputElement>,
	) => {
		onChange({ ...data, [field]: e.target.value });
	};

	return (
		<Accordion
			defaultExpanded
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
				<Typography variant="subtitle2">Basic Information</Typography>
			</AccordionSummary>
			<AccordionDetails sx={{ pt: 2 }}>
				<TextField
					fullWidth
					label="Name"
					value={data.name}
					onChange={handleChange('name')}
					size="small"
					sx={{ mb: 2 }}
					InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)' } }}
					InputProps={{ sx: { color: 'white' } }}
				/>
				<TextField
					fullWidth
					label="Title"
					value={data.title}
					onChange={handleChange('title')}
					size="small"
					sx={{ mb: 2 }}
					InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)' } }}
					InputProps={{ sx: { color: 'white' } }}
				/>
				<TextField
					fullWidth
					label="Summary"
					value={data.summary}
					onChange={handleChange('summary')}
					multiline
					rows={5}
					size="small"
					InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)' } }}
					InputProps={{ sx: { color: 'white' } }}
				/>
			</AccordionDetails>
		</Accordion>
	);
};
