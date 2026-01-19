import { ApolloProvider } from '@apollo/client/react';
import { ThemeProvider } from '@mui/material';
import { Outlet } from '@tanstack/react-router';
import type { FC } from 'react';
import { FileManagerProvider } from './components/FileManager';
import { SettingsProvider } from './components/Settings.provider.tsx';
import { useStore } from './stores/store.provider.tsx';
import { darkTheme } from './theme.ts';

import './App.css';

export const App: FC = () => {
	const { client } = useStore();

	return (
		<ThemeProvider theme={darkTheme}>
			<SettingsProvider>
				<ApolloProvider client={client}>
					<FileManagerProvider>
						<Outlet />
					</FileManagerProvider>
				</ApolloProvider>
			</SettingsProvider>
		</ThemeProvider>
	);
};
