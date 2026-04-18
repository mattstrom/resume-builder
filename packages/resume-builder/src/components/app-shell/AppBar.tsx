import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useSidebar } from '@/components/ui/sidebar';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { useStore } from '@/stores/store.provider';
import { MessageCircle, PanelLeft } from 'lucide-react';
import { observer } from 'mobx-react';
import { type FC, type ReactNode } from 'react';

export interface AppBarProps {
	primaryNav?: ReactNode;
	toolbar?: ReactNode;
}

export const AppBar: FC<AppBarProps> = observer(({ primaryNav, toolbar }) => {
	const { open: sidebarOpen, toggleSidebar } = useSidebar();
	const { uiStateStore } = useStore();
	const { chatOpen } = uiStateStore;

	return (
		<header className="bg-card text-card-foreground border-b border-border print:hidden">
			{/* Row 1: brand + primary nav */}
			<div className="flex items-center gap-2 px-3 h-10 border-b border-border/50">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
								onClick={toggleSidebar}
								aria-label={
									sidebarOpen
										? 'Close sidebar'
										: 'Open sidebar'
								}
							>
								<PanelLeft className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">
							Toggle sidebar (&#8984;B)
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>

				<div className="flex items-center gap-2 pr-2">
					<div className="h-[22px] w-[22px] rounded-[5px] bg-[var(--appbar-accent,hsl(var(--primary)))] grid place-items-center shrink-0">
						<span className="text-[11px] font-bold text-primary-foreground leading-none">
							R
						</span>
					</div>
					<span className="text-[13px] font-semibold tracking-tight leading-none">
						Resume Builder
					</span>
				</div>

				{primaryNav && (
					<>
						<Separator
							orientation="vertical"
							className="h-5 mx-1"
						/>
						{primaryNav}
					</>
				)}

				<div className="flex-1" />

				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
								onClick={() => uiStateStore.setChatOpen()}
								aria-label={
									chatOpen ? 'Close chat' : 'Open chat'
								}
							>
								<MessageCircle
									className={
										chatOpen
											? 'h-4 w-4 text-foreground'
											: 'h-4 w-4'
									}
								/>
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">
							Toggle AI chat
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>

			{/* Row 2: contextual toolbar (only when toolbar content provided) */}
			{toolbar && (
				<div className="flex items-center gap-2 px-3 h-9">
					{toolbar}
				</div>
			)}
		</header>
	);
});
