import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { type FC } from 'react';
import { EducationTransferList } from '../components/EducationTransferList';

interface EducationSectionProps {
	selectedIds: string[];
	onChange: (selectedIds: string[]) => void;
}

export const EducationSection: FC<EducationSectionProps> = ({
	selectedIds,
	onChange,
}) => {
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
				<Typography variant="subtitle2">Education</Typography>
			</AccordionSummary>
			<AccordionDetails sx={{ pt: 2 }}>
				<EducationTransferList selectedIds={selectedIds} onChange={onChange} />
			</AccordionDetails>
		</Accordion>
	);
};
