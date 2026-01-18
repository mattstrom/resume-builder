import {
	Card,
	CardContent,
	CardHeader,
	Collapse,
	IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { type FC, type PropsWithChildren } from 'react';

interface ExpandableCardProps extends PropsWithChildren {
	title: string;
	expanded: boolean;
	onExpandChange: () => void;
	onDelete: () => void;
}

export const ExpandableCard: FC<ExpandableCardProps> = ({
	title,
	expanded,
	onExpandChange,
	onDelete,
	children,
}) => {
	return (
		<Card
			sx={{
				mb: 2,
				backgroundColor: 'rgba(255, 255, 255, 0.05)',
				border: '1px solid rgba(255, 255, 255, 0.1)',
			}}
		>
			<CardHeader
				title={title}
				action={
					<>
						<IconButton
							onClick={onExpandChange}
							sx={{
								transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
								transition: 'transform 0.3s',
								color: 'white',
							}}
							size="small"
						>
							<ExpandMoreIcon />
						</IconButton>
						<IconButton onClick={onDelete} size="small" sx={{ color: 'white' }}>
							<DeleteIcon />
						</IconButton>
					</>
				}
				sx={{
					'& .MuiCardHeader-title': {
						color: 'white',
						fontSize: '0.875rem',
					},
				}}
			/>
			<Collapse in={expanded}>
				<CardContent>{children}</CardContent>
			</Collapse>
		</Card>
	);
};
