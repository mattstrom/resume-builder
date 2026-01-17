import { ThemeProvider } from '@mui/material';
import { Outlet } from '@tanstack/react-router';
import type { FC } from 'react';
import { FileManagerProvider } from './components/FileManager';
import { SettingsProvider } from './components/Settings.provider.tsx';
import { darkTheme } from './theme.ts';

import './App.css';

export const App: FC = () => {
	return (
		<ThemeProvider theme={darkTheme}>
			<SettingsProvider>
				<FileManagerProvider>
					<Outlet />
				</FileManagerProvider>
			</SettingsProvider>
		</ThemeProvider>
	);
};
