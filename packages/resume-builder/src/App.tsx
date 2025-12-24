import './App.css';
import { ResumeLayout } from './components/ResumeLayout.tsx';
import { ResumeProvider } from './components/Resume.provider.tsx';
import { resume } from './data/resume.ts';

export const App = () => {
	return (
		<>
			<ResumeProvider data={resume}>
				<ResumeLayout />
			</ResumeProvider>
		</>
	);
};
