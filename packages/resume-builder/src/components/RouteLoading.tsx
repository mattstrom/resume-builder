import type { FC } from 'react';
import { Box, CircularProgress } from '@mui/material';

export const RouteLoading: FC = () => {
	return (
		<Box
			sx={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				minHeight: '100vh',
				bgcolor: 'background.default',
			}}
		>
			<CircularProgress />
		</Box>
	);
};
