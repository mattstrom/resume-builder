import { type FC, type PropsWithChildren } from 'react';
import { cn } from '@/lib/utils';

interface SidebarProps extends PropsWithChildren {
	isOpen: boolean;
}

export const Sidebar: FC<SidebarProps> = ({ isOpen, children }) => {
	return (
		<aside
			className={cn(
				'h-full bg-slate-900 border-r border-slate-800 overflow-hidden print:hidden',
				'transition-[width] duration-200 ease-in-out',
				isOpen ? 'w-64' : 'w-0',
			)}
		>
			<div className="w-64 h-full flex flex-col">
				<div className="flex items-center px-4 py-3 border-b border-slate-800">
					<span className="text-sm font-medium text-white/70 uppercase tracking-wider">
						Explorer
					</span>
				</div>

				<div className="flex-1 overflow-y-auto p-4">
					{children ?? (
						<p className="text-sm text-white/50">
							Sidebar content goes here.
						</p>
					)}
				</div>
			</div>
		</aside>
	);
};
