import { ApolloProvider } from '@apollo/client/react';
import { ThemeProvider } from '@mui/material';
import { Outlet } from '@tanstack/react-router';
import type { FC } from 'react';
import { client } from './apollo-client.ts';
import { FileManagerProvider } from './components/FileManager';
import { SettingsProvider } from './components/Settings.provider.tsx';
import { darkTheme } from './theme.ts';

import './App.css';

export const App: FC = () => {
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
