import { ApolloProvider } from '@apollo/client/react';
import { Outlet } from '@tanstack/react-router';
import { type FC } from 'react';
import { Toaster } from 'sonner';
import { FileManagerProvider } from './components/FileManager';
import { SettingsProvider } from './components/Settings.provider.tsx';
import { SnackbarProvider } from './components/SnackbarProvider';
import { useStore } from './stores/store.provider.tsx';

import './App.css';

export const App: FC = () => {
	const { client } = useStore();

	return (
		<SnackbarProvider>
			<SettingsProvider>
				<ApolloProvider client={client}>
					<FileManagerProvider>
						<Outlet />
						<Toaster />
					</FileManagerProvider>
				</ApolloProvider>
			</SettingsProvider>
		</SnackbarProvider>
	);
};
