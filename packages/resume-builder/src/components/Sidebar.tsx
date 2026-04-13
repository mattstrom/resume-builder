import { type FC, type PropsWithChildren } from 'react';
import {
	Sidebar as ShadcnSidebar,
	SidebarContent,
	SidebarHeader,
} from '@/components/ui/sidebar';
import { SidebarResumeTree } from './SidebarResumeTree';

export const AppSidebar: FC<PropsWithChildren> = ({ children }) => {
	return (
		<ShadcnSidebar collapsible="icon" className="print:hidden h-full">
			<SidebarHeader className="border-b border-sidebar-border px-4 py-3 group-data-[collapsible=icon]:px-2">
				<span className="text-sm font-medium text-sidebar-foreground/70 uppercase tracking-wider group-data-[collapsible=icon]:hidden">
					Explorer
				</span>
			</SidebarHeader>
			<SidebarContent>
				<SidebarResumeTree />
				{children}
			</SidebarContent>
		</ShadcnSidebar>
	);
};
