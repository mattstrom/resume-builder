import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useEffect } from 'react';
import { ResumeProvider } from '../components/Resume.provider.tsx';
import { useFileManager } from '../components/FileManager';
import { EditorToolbar } from '../components/EditorToolbar.tsx';
import { Sidebar } from '../components/Sidebar.tsx';
import { useSettings } from '../components/Settings.provider.tsx';

export const Route = createFileRoute('/editor')({
	component: EditorLayout,
});

function EditorLayout() {
	const { resumeData } = useFileManager();
	const { sidebarOpen, setSidebarOpen } = useSettings();

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
				e.preventDefault();
				setSidebarOpen((prev: boolean) => !prev);
			}
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, [setSidebarOpen]);

	return (
		<>
			<EditorToolbar />
			<div className="flex h-[calc(100vh-64px)]">
				<Sidebar isOpen={sidebarOpen} />
				<div className="flex-1 min-w-0">
					{resumeData ? (
						<ResumeProvider data={resumeData}>
							<Outlet />
						</ResumeProvider>
					) : (
						<Outlet />
					)}
				</div>
			</div>
		</>
	);
}
