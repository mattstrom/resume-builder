import { createFileRoute } from '@tanstack/react-router';
import { Box, Typography } from '@mui/material';
import { useEffect } from 'react';
import { Workspace } from '../../components/Workspace.tsx';
import { useFileManager } from '../../components/FileManager';

export const Route = createFileRoute('/editor/')({
	component: EditorIndexComponent,
});

function EditorIndexComponent() {
	const { resumeData } = useFileManager();

	useEffect(() => {
		if (resumeData) {
			const name = resumeData.data.name;
			const company = resumeData.company;
			const titleParts = ['Resume', name];
			if (company) {
				titleParts.push(company);
			}
			document.title = titleParts.join(' - ');
		} else {
			document.title = 'Resume Builder';
		}

		return () => {
			document.title = 'Resume Builder';
		};
	}, [resumeData]);

	// Show empty state if no resume is loaded
	if (!resumeData) {
		return (
			<Box
				sx={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					height: 'calc(100vh - 64px)', // Subtract toolbar height
					padding: 3,
					textAlign: 'center',
				}}
			>
				<Typography variant="h4" sx={{ mb: 2, color: 'white' }}>
					No Resume Selected
				</Typography>
				<Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
					Select a resume from the file manager to get started
				</Typography>
			</Box>
		);
	}

	return <Workspace />;
}
