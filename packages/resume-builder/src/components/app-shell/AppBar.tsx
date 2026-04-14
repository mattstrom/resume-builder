import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useSidebar } from '@/components/ui/sidebar';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { observer } from 'mobx-react';
import { type FC, type ReactNode } from 'react';

export interface AppBarProps {
	toolbar?: ReactNode;
}

export const AppBar: FC<AppBarProps> = observer(({ toolbar }) => {
	const { open: sidebarOpen, toggleSidebar } = useSidebar();

	return (
		<header className="bg-card text-card-foreground border-b border-border">
			<div className="flex items-center gap-4 flex-wrap p-4">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onClick={toggleSidebar}
								aria-label={
									sidebarOpen
										? 'Close sidebar'
										: 'Open sidebar'
								}
							>
								{sidebarOpen ? (
									<PanelLeftClose className="h-5 w-5" />
								) : (
									<PanelLeftOpen className="h-5 w-5" />
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">
							Toggle sidebar (&#8984;B)
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>

				<h1 className="text-xl font-semibold">Resume Builder</h1>

				<Separator orientation="vertical" className="h-6" />

				<div>{toolbar}</div>
			</div>
		</header>
	);
});
