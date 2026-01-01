import type { FC } from 'react';

import { ResumeProvider } from './components/Resume.provider.tsx';
import { resume } from './data/resume.ts';
import { Workspace } from './components/Workspace.tsx';
import { SettingsProvider } from './components/Settings.provider.tsx';
import { FileManagerProvider, useFileManager } from './components/FileManager';

import './App.css';
import { ThemeProvider } from '@mui/material';
import { darkTheme } from './theme.ts';

const AppContent: FC = () => {
	const { resumeData } = useFileManager();

	// Use file-loaded resume if available, otherwise fallback to hardcoded
	const activeResume = resumeData ?? resume;

	return (
		<ResumeProvider data={activeResume}>
			<Workspace />
		</ResumeProvider>
	);
};

export const App: FC = () => {
	return (
		<ThemeProvider theme={darkTheme}>
			<SettingsProvider>
				<FileManagerProvider>
					<AppContent />
				</FileManagerProvider>
			</SettingsProvider>
		</ThemeProvider>
	);
};
