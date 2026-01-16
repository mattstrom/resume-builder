import type { FC } from 'react';
import { Link, type ErrorComponentProps } from '@tanstack/react-router';
import { Box, Typography, Button, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export const RouteError: FC<ErrorComponentProps> = ({ error }) => {
	const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
	const isNotFound = errorMessage.includes('404') || errorMessage.includes('not found');

	return (
		<Box
			sx={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				minHeight: '100vh',
				bgcolor: 'background.default',
				p: 3,
			}}
		>
			<Paper
				elevation={3}
				sx={{
					p: 4,
					maxWidth: 500,
					textAlign: 'center',
				}}
			>
				<ErrorOutlineIcon
					sx={{
						fontSize: 64,
						color: 'error.main',
						mb: 2,
					}}
				/>
				<Typography variant="h4" gutterBottom>
					{isNotFound ? 'Not Found' : 'Error'}
				</Typography>
				<Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
					{errorMessage}
				</Typography>
				<Button
					component={Link}
					to="/editor"
					variant="contained"
					color="primary"
				>
					Go to Editor
				</Button>
			</Paper>
		</Box>
	);
};
