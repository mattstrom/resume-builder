import type { FC } from 'react';

import { ResumeProvider } from './components/Resume.provider.tsx';
import { resume } from './data/resume.ts';
import { Workspace } from './components/Workspace.tsx';
import { SettingsProvider } from './components/Settings.provider.tsx';

import './App.css';

export const App: FC = () => {
	return (
		<SettingsProvider>
			<ResumeProvider data={resume}>
				<Workspace />
			</ResumeProvider>
		</SettingsProvider>
	);
};
