import { AppBar } from '@/components/app-shell/AppBar.tsx';
import { ChatPanel } from '@/components/chat/ChatPanel.tsx';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar.tsx';
import { useStore } from '@/stores/store.provider.tsx';
import { Outlet } from '@tanstack/react-router';
import { autorun } from 'mobx';
import { observer } from 'mobx-react';
import {
	type CSSProperties,
	type FC,
	type PropsWithChildren,
	useEffect,
	useRef,
} from 'react';
import {
	Group as PanelGroup,
	Panel,
	type PanelImperativeHandle,
	Separator as PanelResizeHandle,
} from 'react-resizable-panels';
import { AppSidebar } from './AppSidebar.tsx';

import './AppShell.css';

interface AppShellProps extends PropsWithChildren {}

export const AppShell: FC<AppShellProps> = observer(({ children }) => {
	const sidebarPanelRef = useRef<PanelImperativeHandle>(null);
	const { uiStateStore } = useStore();
	const { chatOpen, sidebarOpen } = uiStateStore;

	const sidebarDefaultSize =
		Number(localStorage.getItem('sidebar-panel-size')) || 15;
	const chatDefaultSize =
		Number(localStorage.getItem('chat-panel-size')) || 25;

	useEffect(
		() =>
			autorun(() => {
				const panel = sidebarPanelRef.current;
				const { sidebarOpen } = uiStateStore;
				if (!panel) {
					return;
				}

				if (sidebarOpen && panel.isCollapsed()) {
					panel.expand();
				} else if (!sidebarOpen && !panel.isCollapsed()) {
					panel.collapse();
				}
			}),
		[],
	);

	return (
		<SidebarProvider
			open={sidebarOpen}
			onOpenChange={(open) => uiStateStore.setSidebarOpen(open)}
			style={{ '--sidebar-width': '100%' } as CSSProperties}
			className="min-h-0 h-screen flex-col"
		>
			<AppBar />
			<PanelGroup orientation="horizontal" className="flex-1 min-h-0">
				<Panel
					panelRef={sidebarPanelRef}
					id="sidebar"
					collapsible
					collapsedSize="3rem"
					defaultSize={`${sidebarDefaultSize}%`}
					minSize="8%"
					maxSize="30%"
					onResize={(size) =>
						localStorage.setItem('sidebar-panel-size', String(size))
					}
				>
					<AppSidebar />
				</Panel>
				<PanelResizeHandle className="editor-resize-handle" />
				<Panel id="main">
					<SidebarInset className="h-full">
						{children ?? <Outlet />}
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
});
