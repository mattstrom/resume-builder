import { createFileRoute, Outlet } from '@tanstack/react-router';
import { ResumeProvider } from '../components/Resume.provider.tsx';
import { useFileManager } from '../components/FileManager';
import { EditorToolbar } from '../components/EditorToolbar.tsx';

export const Route = createFileRoute('/editor')({
	component: EditorLayout,
});

function EditorLayout() {
	const { resumeData } = useFileManager();

	return (
		<>
			<EditorToolbar />
			{resumeData ? (
				<ResumeProvider data={resumeData}>
					<Outlet />
				</ResumeProvider>
			) : (
				<Outlet />
			)}
		</>
	);
}
