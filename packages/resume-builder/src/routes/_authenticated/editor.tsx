import { AppShell } from '@/components/app-shell/AppShell.tsx';
import { ResumePrimaryNav } from '@/components/resumes/ResumePrimaryNav.tsx';
import { ResumeToolbar } from '@/components/resumes/ResumeToolbar.tsx';
import { getActiveResumeController } from '@/lib/active-resume-controller.ts';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useFileManager } from '../../components/FileManager';
import { ResumeProvider } from '../../components/Resume.provider.tsx';

export const Route = createFileRoute('/_authenticated/editor')({
	component: EditorLayout,
});

function EditorLayout() {
	const { resumeData } = useFileManager();

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (!(event.metaKey || event.ctrlKey) || event.altKey) {
				return;
			}

			if (event.key.toLowerCase() !== 'z') {
				return;
			}

			const target = event.target;

			if (
				target instanceof HTMLElement &&
				(target.isContentEditable ||
					target.closest(
						'input, textarea, select, [contenteditable="true"]',
					))
			) {
				return;
			}

			const controller = getActiveResumeController(resumeData?._id);

			if (!controller) {
				return;
			}

			event.preventDefault();

			if (event.shiftKey) {
				controller.redo();
				return;
			}

			controller.undo();
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [resumeData?._id]);

	return (
		<AppShell primaryNav={<ResumePrimaryNav />} toolbar={<ResumeToolbar />}>
			{resumeData ? (
				<ResumeProvider data={resumeData}>
					<Outlet />
				</ResumeProvider>
			) : (
				<Outlet />
			)}
		</AppShell>
	);
}
