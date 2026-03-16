import { type FC, type PropsWithChildren } from 'react';
import {
	Sidebar as ShadcnSidebar,
	SidebarContent,
	SidebarHeader,
} from '@/components/ui/sidebar';
import { SidebarResumeTree } from './SidebarResumeTree';

export const AppSidebar: FC<PropsWithChildren> = ({ children }) => {
	return (
		<ShadcnSidebar className="print:hidden">
			<SidebarHeader className="border-b border-sidebar-border px-4 py-3">
				<span className="text-sm font-medium text-sidebar-foreground/70 uppercase tracking-wider">
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
