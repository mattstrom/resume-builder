import { createFileRoute, Outlet } from '@tanstack/react-router';
import { ChatPanel } from '../components/ChatPanel.tsx';
import { ResumeProvider } from '../components/Resume.provider.tsx';
import { useFileManager } from '../components/FileManager';
import { EditorToolbar } from '../components/EditorToolbar.tsx';
import { AppSidebar } from '../components/Sidebar.tsx';
import { useSettings } from '../components/Settings.provider.tsx';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export const Route = createFileRoute('/editor')({
	component: EditorLayout,
});

function EditorLayout() {
	const { resumeData } = useFileManager();
	const { sidebarOpen, setSidebarOpen, chatOpen } = useSettings();

	return (
		<SidebarProvider
			open={sidebarOpen}
			onOpenChange={setSidebarOpen}
			className="min-h-0 h-screen flex-col"
		>
			<EditorToolbar />
			<div className="flex flex-1 min-h-0">
				<AppSidebar />
				<SidebarInset className="flex-1 min-w-0">
					{resumeData ? (
						<ResumeProvider data={resumeData}>
							<Outlet />
						</ResumeProvider>
					) : (
						<Outlet />
					)}
				</SidebarInset>
				{chatOpen && <ChatPanel />}
			</div>
		</SidebarProvider>
	);
}
