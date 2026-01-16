import { createRootRoute, Outlet } from '@tanstack/react-router';
import { ThemeProvider } from '@mui/material';
import { darkTheme } from '../theme.ts';
import { SettingsProvider } from '../components/Settings.provider.tsx';
import { FileManagerProvider } from '../components/FileManager';
import '../App.css';

export const Route = createRootRoute({
	component: RootComponent,
});

function RootComponent() {
	return (
		<ThemeProvider theme={darkTheme}>
			<SettingsProvider>
				<FileManagerProvider>
					<Outlet />
				</FileManagerProvider>
			</SettingsProvider>
		</ThemeProvider>
	);
}
