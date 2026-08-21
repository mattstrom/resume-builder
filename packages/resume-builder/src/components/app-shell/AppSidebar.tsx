import {
	ChevronsUpDown,
	BriefcaseBusiness,
	BookOpen,
	Database,
	FileText,
	FolderKanban,
	HeartHandshake,
	Home,
	Inbox,
	LogOut,
	Monitor,
	Moon,
	Palette,
	Quote,
	Search,
	Sparkles,
	SlidersHorizontal,
	Sun,
	Tags,
	UserRound,
	Wrench,
} from 'lucide-react';
import { observer } from 'mobx-react';
import { type FC, type PropsWithChildren } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { Button } from '@/components/ui/button.tsx';
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
import { useStore } from '@/stores/store.provider.tsx';
import type { Theme } from '@/stores/theme.store.ts';

import { SidebarResumeTree } from '../SidebarResumeTree';

export const AppSidebar: FC<PropsWithChildren> = observer(({ children }) => {
	const { authStore, themeStore, uiStateStore } = useStore();
	const user = authStore.user;

	return (
		<ShadcnSidebar collapsible="icon" className="print:hidden h-full">
			<SidebarHeader className="border-b border-sidebar-border px-2 py-2 group-data-[collapsible=icon]:px-2">
				<Button
					variant="outline"
					size="sm"
					className="w-full justify-start group-data-[collapsible=icon]:hidden"
					onClick={() => uiStateStore.setCommandPaletteOpen(true)}
				>
					<Search data-icon="inline-start" />
					<span>Search resumes…</span>
					<kbd className="ml-auto text-xs text-muted-foreground">⌘K</kbd>
				</Button>
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
							<SidebarMenuItem>
								<SidebarMenuButton to="/feedback" tooltip="Feedback inbox">
									<Inbox />
									<span>Feedback inbox</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton to="/search" tooltip="Advanced search">
									<Sparkles />
									<span>Advanced search</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<SidebarResumeTree />
				<SidebarGroup>
					<SidebarGroupLabel>Profile</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton
									to="/profile/background"
									tooltip="Personal Details"
								>
									<UserRound />
									<span>Personal Details</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton
									to="/profile/work-history"
									tooltip="Work History"
								>
									<BriefcaseBusiness />
									<span>Work History</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton to="/profile/projects" tooltip="Projects">
									<FolderKanban />
									<span>Projects</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton to="/profile/skills" tooltip="Skills">
									<Wrench />
									<span>Skills</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton
									to="/profile/volunteering"
									tooltip="Volunteering"
								>
									<HeartHandshake />
									<span>Volunteering</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton to="/profile" tooltip="Narrative">
									<FileText />
									<span>Narrative</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton
									to="/profile/statements"
									tooltip="Professional Statements"
								>
									<Quote />
									<span>Professional Statements</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton to="/profile/facts" tooltip="Facts">
									<Database />
									<span>Facts</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton to="/profile/concepts" tooltip="Concepts">
									<Tags />
									<span>Concepts</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton
									to="/profile/knowledge"
									tooltip="Profile knowledge"
								>
									<BookOpen />
									<span>Profile knowledge</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton
									to="/profile/preferences"
									tooltip="Job Preferences"
								>
									<SlidersHorizontal />
									<span>Job Preferences</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
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
										<AvatarImage src={user?.picture} alt={user?.name} />
										<AvatarFallback className="rounded-lg bg-muted text-muted-foreground text-xs">
											{authStore.userInitial}
										</AvatarFallback>
									</Avatar>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-semibold">{user?.name}</span>
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
									<UserRound />
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
												themeStore.setTheme(value as Theme)
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
								<DropdownMenuItem onSelect={() => void authStore.logout()}>
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
