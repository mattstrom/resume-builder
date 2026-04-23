import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from '@/components/ui/avatar.tsx';
import { Input } from '@/components/ui/input.tsx';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStore } from '@/stores/store.provider.tsx';
import type { Theme } from '@/stores/theme.store.ts';
import {
	ChevronsUpDown,
	Home,
	LogOut,
	Monitor,
	Moon,
	Palette,
	Search,
	Sun,
	UserCog,
	X,
} from 'lucide-react';
import { observer } from 'mobx-react';
import { type FC, type PropsWithChildren, useEffect, useRef } from 'react';
import {
	Sidebar as ShadcnSidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from '@/components/ui/sidebar';
import { SidebarResumeTree } from '../SidebarResumeTree';

export const AppSidebar: FC<PropsWithChildren> = observer(({ children }) => {
	const { authStore, themeStore, explorerSidebarStore } = useStore();
	const user = authStore.user;
	const searchRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.metaKey && e.key === 'k') {
				e.preventDefault();
				searchRef.current?.focus();
				searchRef.current?.select();
			}
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, []);

	return (
		<ShadcnSidebar collapsible="icon" className="print:hidden h-full">
			<SidebarHeader className="border-b border-sidebar-border px-2 py-2 group-data-[collapsible=icon]:px-2">
				<div className="relative group-data-[collapsible=icon]:hidden">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
					<Input
						ref={searchRef}
						placeholder="Search…"
						className="h-7 pl-8 pr-8 text-xs bg-muted/40 border-sidebar-border focus-visible:ring-1"
						value={explorerSidebarStore.searchQuery}
						onChange={(e) =>
							explorerSidebarStore.setSearchQuery(e.target.value)
						}
						onKeyDown={(e) => {
							if (e.key === 'Escape') {
								explorerSidebarStore.setSearchQuery('');
								e.currentTarget.blur();
							}
						}}
					/>
					{explorerSidebarStore.searchQuery ? (
						<button
							className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground"
							onClick={() =>
								explorerSidebarStore.setSearchQuery('')
							}
						>
							<X className="h-3 w-3" />
						</button>
					) : (
						<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/60 font-mono border border-sidebar-border rounded px-1 bg-background">
							⌘K
						</span>
					)}
				</div>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Workspace</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton to="/home">
									<Home />
									<span>Home</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<SidebarGroup>
					<SidebarGroupLabel>Profile</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenuButton to="/profile/background">
							Background
						</SidebarMenuButton>
						<SidebarMenuButton to="/profile">
							Narrative
						</SidebarMenuButton>
						<SidebarMenuButton to="/profile/preferences">
							Job Preferences
						</SidebarMenuButton>
					</SidebarGroupContent>
				</SidebarGroup>
				<SidebarResumeTree />
				{children}
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton
									size="lg"
									tooltip={user?.name ?? 'Account'}
									className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
								>
									<Avatar className="h-8 w-8 rounded-lg">
										<AvatarImage
											src={user?.picture}
											alt={user?.name}
										/>
										<AvatarFallback className="rounded-lg bg-muted text-muted-foreground text-xs">
											{authStore.userInitial}
										</AvatarFallback>
									</Avatar>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-semibold">
											{user?.name}
										</span>
										<span className="truncate text-xs text-sidebar-foreground/70">
											{user?.email}
										</span>
									</div>
									<ChevronsUpDown className="ml-auto size-4" />
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								side="right"
								align="end"
								sideOffset={8}
								className="w-56"
							>
								<DropdownMenuLabel className="font-normal">
									<div className="flex flex-col space-y-1">
										<p className="text-sm font-medium leading-none">
											{user?.name}
										</p>
										<p className="text-xs leading-none text-muted-foreground">
											{user?.email}
										</p>
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem>
									<UserCog />
									Manage account
								</DropdownMenuItem>
								<DropdownMenuSub>
									<DropdownMenuSubTrigger>
										<Palette />
										Appearance
									</DropdownMenuSubTrigger>
									<DropdownMenuSubContent className="w-40">
										<DropdownMenuRadioGroup
											value={themeStore.theme}
											onValueChange={(value) =>
												themeStore.setTheme(
													value as Theme,
												)
											}
										>
											<DropdownMenuRadioItem value="light">
												<Sun />
												Light
											</DropdownMenuRadioItem>
											<DropdownMenuRadioItem value="dark">
												<Moon />
												Dark
											</DropdownMenuRadioItem>
											<DropdownMenuRadioItem value="system">
												<Monitor />
												System
											</DropdownMenuRadioItem>
										</DropdownMenuRadioGroup>
									</DropdownMenuSubContent>
								</DropdownMenuSub>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onSelect={() => void authStore.logout()}
								>
									<LogOut />
									Log out
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</ShadcnSidebar>
	);
});
