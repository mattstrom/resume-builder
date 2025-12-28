import type { FC } from 'react';

import { ResumeProvider } from './components/Resume.provider.tsx';
import { resume } from './data/resume.ts';
import { Workspace } from './components/Workspace.tsx';
import { SettingsProvider } from './components/Settings.provider.tsx';

import './App.css';
import { ThemeProvider } from '@mui/material';
import { darkTheme } from './theme.ts';

export const App: FC = () => {
	return (
		<ThemeProvider theme={darkTheme}>
			<SettingsProvider>
				<ResumeProvider data={resume}>
					<Workspace />
				</ResumeProvider>
			</SettingsProvider>
		</ThemeProvider>
	);
};
