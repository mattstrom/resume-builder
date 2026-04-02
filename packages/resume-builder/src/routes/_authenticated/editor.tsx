import { createFileRoute, Outlet } from '@tanstack/react-router';
import { type CSSProperties, useEffect, useRef } from 'react';
import {
	Panel,
	Group as PanelGroup,
	Separator as PanelResizeHandle,
	type PanelImperativeHandle,
} from 'react-resizable-panels';
import { ChatPanel } from '../../components/ChatPanel.tsx';
import { ResumeProvider } from '../../components/Resume.provider.tsx';
import { useFileManager } from '../../components/FileManager';
import { EditorToolbar } from '../../components/EditorToolbar.tsx';
import { AppSidebar } from '../../components/Sidebar.tsx';
import { useSettings } from '../../components/Settings.provider.tsx';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { getActiveResumeController } from '@/lib/active-resume-controller.ts';
import './editor.css';

export const Route = createFileRoute('/_authenticated/editor')({
	component: EditorLayout,
});

function EditorLayout() {
	const { resumeData } = useFileManager();
	const { sidebarOpen, setSidebarOpen, chatOpen } = useSettings();
	const sidebarPanelRef = useRef<PanelImperativeHandle>(null);

	const sidebarDefaultSize =
		Number(localStorage.getItem('sidebar-panel-size')) || 15;
	const chatDefaultSize =
		Number(localStorage.getItem('chat-panel-size')) || 25;

	useEffect(() => {
		const panel = sidebarPanelRef.current;
		if (!panel) return;
		if (sidebarOpen && panel.isCollapsed()) {
			panel.expand();
		} else if (!sidebarOpen && !panel.isCollapsed()) {
			panel.collapse();
		}
	}, [sidebarOpen]);

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
		<SidebarProvider
			open={sidebarOpen}
			onOpenChange={setSidebarOpen}
			style={{ '--sidebar-width': '100%' } as CSSProperties}
			className="min-h-0 h-screen flex-col"
		>
			<EditorToolbar />
			<PanelGroup orientation="horizontal" className="flex-1 min-h-0">
				<Panel
					ref={sidebarPanelRef}
					id="sidebar"
					collapsible
					defaultSize={`${sidebarDefaultSize}%`}
					minSize="8%"
					maxSize="30%"
					onCollapse={() => setSidebarOpen(false)}
					onExpand={() => setSidebarOpen(true)}
					onResize={(size) =>
						localStorage.setItem('sidebar-panel-size', String(size))
					}
				>
					<AppSidebar />
				</Panel>
				<PanelResizeHandle className="editor-resize-handle" />
				<Panel id="main">
					<SidebarInset className="h-full">
						{resumeData ? (
							<ResumeProvider data={resumeData}>
								<Outlet />
							</ResumeProvider>
						) : (
							<Outlet />
						)}
					</SidebarInset>
				</Panel>
				{chatOpen && (
					<>
						<PanelResizeHandle className="editor-resize-handle" />
						<Panel
							id="chat"
							defaultSize={`${chatDefaultSize}%`}
							minSize="15%"
							maxSize="40%"
							onResize={(size) =>
								localStorage.setItem(
									'chat-panel-size',
									String(size),
								)
							}
						>
							<ChatPanel />
						</Panel>
					</>
				)}
			</PanelGroup>
		</SidebarProvider>
	);
}
