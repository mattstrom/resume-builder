import { createFileRoute, Outlet } from '@tanstack/react-router';
import { ResumeProvider } from '../components/Resume.provider.tsx';
import { resume } from '../data/resume.ts';
import { useFileManager } from '../components/FileManager';

export const Route = createFileRoute('/editor')({
	component: EditorLayout,
});

function EditorLayout() {
	const { resumeData } = useFileManager();

	// Use file-loaded resume if available, otherwise fallback to hardcoded
	const activeResume = resumeData ?? resume;

	return (
		<ResumeProvider data={activeResume}>
			<Outlet />
		</ResumeProvider>
	);
}
