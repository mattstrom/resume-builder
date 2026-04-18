import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from '@/components/ui/avatar.tsx';
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
	LogOut,
	Monitor,
	Moon,
	Palette,
	Sun,
	UserCog,
} from 'lucide-react';
import { observer } from 'mobx-react';
import { type FC, type PropsWithChildren } from 'react';
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
	const { authStore, themeStore } = useStore();
	const user = authStore.user;

	return (
		<ShadcnSidebar collapsible="icon" className="print:hidden h-full">
			<SidebarHeader className="border-b border-sidebar-border px-4 py-3 group-data-[collapsible=icon]:px-2">
				<span className="text-sm font-medium text-sidebar-foreground/70 uppercase tracking-wider group-data-[collapsible=icon]:hidden">
					Explorer
				</span>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Profile</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenuButton to="/profile">
							Narrative
						</SidebarMenuButton>
						<SidebarMenuButton to="/profile/preferences">
							Job Preferences
						</SidebarMenuButton>
						<SidebarMenuButton>
							Contact Information
						</SidebarMenuButton>
						<SidebarMenuButton>Education</SidebarMenuButton>
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
