import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	TextField,
	Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { type ChangeEvent, type FC } from 'react';

interface ContactInfo {
	location: string;
	email: string;
	phoneNumber: string;
	linkedInProfile: string;
	githubProfile: string;
	personalWebsite: string;
}

interface ContactInfoSectionProps {
	data: ContactInfo;
	onChange: (data: ContactInfo) => void;
}

export const ContactInfoSection: FC<ContactInfoSectionProps> = ({
	data,
	onChange,
}) => {
	const handleChange = (field: keyof ContactInfo) => (
		e: ChangeEvent<HTMLInputElement>,
	) => {
		onChange({ ...data, [field]: e.target.value });
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
				<Typography variant="subtitle2">Contact Information</Typography>
			</AccordionSummary>
			<AccordionDetails sx={{ pt: 2 }}>
				<TextField
					fullWidth
					label="Location"
					value={data.location}
					onChange={handleChange('location')}
					size="small"
					sx={{ mb: 2 }}
					InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)' } }}
					InputProps={{ sx: { color: 'white' } }}
				/>
				<TextField
					fullWidth
					label="Email"
					type="email"
					value={data.email}
					onChange={handleChange('email')}
					size="small"
					sx={{ mb: 2 }}
					InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)' } }}
					InputProps={{ sx: { color: 'white' } }}
				/>
				<TextField
					fullWidth
					label="Phone Number"
					value={data.phoneNumber}
					onChange={handleChange('phoneNumber')}
					size="small"
					sx={{ mb: 2 }}
					InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)' } }}
					InputProps={{ sx: { color: 'white' } }}
				/>
				<TextField
					fullWidth
					label="LinkedIn Profile"
					value={data.linkedInProfile}
					onChange={handleChange('linkedInProfile')}
					size="small"
					sx={{ mb: 2 }}
					InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)' } }}
					InputProps={{ sx: { color: 'white' } }}
				/>
				<TextField
					fullWidth
					label="GitHub Profile"
					value={data.githubProfile}
					onChange={handleChange('githubProfile')}
					size="small"
					sx={{ mb: 2 }}
					InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)' } }}
					InputProps={{ sx: { color: 'white' } }}
				/>
				<TextField
					fullWidth
					label="Personal Website"
					value={data.personalWebsite}
					onChange={handleChange('personalWebsite')}
					size="small"
					InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)' } }}
					InputProps={{ sx: { color: 'white' } }}
				/>
			</AccordionDetails>
		</Accordion>
	);
};
