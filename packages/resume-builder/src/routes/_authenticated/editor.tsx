import { AppShell } from '@/components/app-shell/AppShell.tsx';
import { AnalysisToolbar } from '@/components/analysis/AnalysisToolbar.tsx';
import { ResumePrimaryNav } from '@/components/resumes/ResumePrimaryNav.tsx';
import { ResumeSwitcher } from '@/components/resumes/ResumeSwitcher.tsx';
import { ResumeToolbar } from '@/components/resumes/ResumeToolbar.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { getActiveResumeController } from '@/lib/active-resume-controller.ts';
import { useStore } from '@/stores/store.provider.tsx';
import { Mode } from '@/stores/ui-state.store.ts';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { observer } from 'mobx-react';
import { useEffect } from 'react';
import { ResumeProvider } from '../../components/Resume.provider.tsx';

const EditorLayout = observer(function EditorLayout() {
	const { editorStore, uiStateStore } = useStore();
	const { resumeData } = editorStore;

	const modeToolbar =
		uiStateStore.mode === Mode.Analysis ? (
			<AnalysisToolbar />
		) : (
			<ResumeToolbar />
		);

	const toolbar = editorStore.selectedApiApplicationId ? (
		<>
			<ResumeSwitcher />
			<Separator orientation="vertical" className="h-5 shrink-0" />
			{modeToolbar}
		</>
	) : (
		modeToolbar
	);

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
		<AppShell primaryNav={<ResumePrimaryNav />} toolbar={toolbar}>
			{resumeData ? (
				<ResumeProvider data={resumeData}>
					<Outlet />
				</ResumeProvider>
			) : (
				<Outlet />
			)}
		</AppShell>
	);
});

export const Route = createFileRoute('/_authenticated/editor')({
	component: EditorLayout,
});
