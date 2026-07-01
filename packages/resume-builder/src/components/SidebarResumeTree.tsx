import type { Application } from '@resume-builder/entities';
import {
	ArrowUpDown,
	Building2,
	ChevronRight,
	Clock3,
	FileIcon,
	MoreHorizontal,
	Pin,
	PinOff,
	Plus,
	RefreshCw,
} from 'lucide-react';
import { observer } from 'mobx-react';
import { type FC, useCallback, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

import { useStore } from '../stores/store.provider';
import { CreateApplicationDialog } from './CreateResumeDialog';

const SORT_OPTIONS = [
	{ value: 'SORT_NAME', label: 'Name' },
	{ value: 'SORT_DATE', label: 'Date' },
] as const;

const GROUP_OPTIONS = [
	{ value: 'GROUP_NONE', label: 'None' },
	{ value: 'GROUP_COMPANY', label: 'Company' },
] as const;

const sectionLabelClass =
	'flex h-4 items-center gap-1 px-2 text-[10.5px] font-medium text-sidebar-foreground/50';

const sectionLabelIconClass = 'size-3 opacity-70';

export const SidebarResumeTree: FC = observer(() => {
	const { applicationStore, explorerSidebarStore, editorStore } = useStore();
	const { selectedApiApplicationId } = editorStore;
	const selectApiApplication = (id: string) => void editorStore.selectApplication(id);
	const [companyBrowserOpen, setCompanyBrowserOpen] = useState(false);

	const applications = explorerSidebarStore.applications;
	const pinnedApplications = explorerSidebarStore.pinnedApplications;
	const recentApplications = explorerSidebarStore.recentApplications;
	const groupedApplications = explorerSidebarStore.groupedApplications;
	const allGroupsCollapsed = explorerSidebarStore.allGroupsCollapsed;
	const searchActive = Boolean(explorerSidebarStore.searchQuery.trim());

	const handleSortChange = useCallback(
		(value: string) => {
			if (!value.startsWith('APPLICATION_SORT_')) return;
			explorerSidebarStore.setApplicationSort(
				value === 'APPLICATION_SORT_NAME' ? 'NAME' : 'DATE',
			);
		},
		[explorerSidebarStore],
	);

	const handleGroupSortChange = useCallback(
		(value: string) => {
			if (!value.startsWith('GROUP_SORT_')) return;
			explorerSidebarStore.setGroupSort(value === 'GROUP_SORT_NAME' ? 'NAME' : 'DATE');
		},
		[explorerSidebarStore],
	);

	const handleGroupChange = useCallback(
		(value: string) => {
			if (!value.startsWith('GROUP_')) return;
			const groupMap: Record<string, 'company' | null> = {
				GROUP_NONE: null,
				GROUP_COMPANY: 'company',
			};
			explorerSidebarStore.setGroupBy(groupMap[value] ?? null);
		},
		[explorerSidebarStore],
	);

	const handleGroupToggle = useCallback(
		(groupName: string, open: boolean) => {
			explorerSidebarStore.setGroupOpen(groupName, open);
		},
		[explorerSidebarStore],
	);

	const toggleAllGroups = useCallback(() => {
		explorerSidebarStore.toggleAllGroups();
	}, [explorerSidebarStore]);

	const togglePinnedApplication = useCallback(
		(applicationId: string) => {
			explorerSidebarStore.togglePinnedApplication(applicationId);
		},
		[explorerSidebarStore],
	);

	const renderApplicationItem = (application: Application, compact = false) => {
		const isPinned = explorerSidebarStore.isApplicationPinned(application._id);
		const company = formatApplicationCompany(application.company);
		const updatedAt = formatApplicationUpdatedAt(application.updatedAt);

		return (
			<SidebarMenuItem key={application._id}>
				<SidebarMenuButton
					size={compact ? 'sm' : 'default'}
					className={cn(!compact && 'h-auto min-h-12 items-start px-2 py-1.5 pr-7')}
					to="/editor/$applicationId"
					params={{ applicationId: application._id }}
					isActive={selectedApiApplicationId === application._id}
					onClick={() => void selectApiApplication(application._id)}
					tooltip={application.name}
				>
					{compact && <FileIcon />}
					<span className="flex min-w-0 flex-1 flex-col gap-1">
						<span
							className={cn(
								'min-w-0 truncate font-medium leading-tight',
								compact ? 'text-xs' : 'text-[13px]',
							)}
						>
							{application.name}
						</span>
						{!compact && (
							<span className="flex min-w-0 items-center gap-1.5 text-[11px] font-normal leading-none text-sidebar-foreground/60">
								<span className="min-w-0 truncate">{company}</span>
								<span className="shrink-0 text-sidebar-foreground/35">/</span>
								<span className="shrink-0">{updatedAt}</span>
							</span>
						)}
					</span>
				</SidebarMenuButton>
				<SidebarMenuAction
					showOnHover
					title={isPinned ? 'Unpin application' : 'Pin application'}
					onClick={() => togglePinnedApplication(application._id)}
				>
					{isPinned ? <PinOff /> : <Pin />}
				</SidebarMenuAction>
			</SidebarMenuItem>
		);
	};

	const renderGroupedApplicationItem = (application: Application) => {
		const isPinned = explorerSidebarStore.isApplicationPinned(application._id);

		return (
			<SidebarMenuItem key={application._id} className="list-none">
				<SidebarMenuButton
					size="sm"
					className="pr-7"
					to="/editor/$applicationId"
					params={{ applicationId: application._id }}
					isActive={selectedApiApplicationId === application._id}
					onClick={() => void selectApiApplication(application._id)}
					tooltip={application.name}
				>
					<FileIcon />
					<span className="truncate">{application.name}</span>
				</SidebarMenuButton>
				<SidebarMenuAction
					showOnHover
					title={isPinned ? 'Unpin application' : 'Pin application'}
					onClick={() => togglePinnedApplication(application._id)}
				>
					{isPinned ? <PinOff /> : <Pin />}
				</SidebarMenuAction>
			</SidebarMenuItem>
		);
	};

	const renderGroupedApplications = (groups: Map<string, Application[]>) =>
		Array.from(groups.entries()).map(([groupName, groupApplications]) => (
			<SidebarMenuItem key={groupName}>
				<Collapsible
					open={explorerSidebarStore.isGroupOpen(groupName)}
					onOpenChange={(open) => handleGroupToggle(groupName, open)}
					className="group/collapsible"
				>
					<CollapsibleTrigger asChild>
						<SidebarMenuButton>
							<ChevronRight className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
							<span>{groupName}</span>
							<Badge variant="secondary" className="ml-auto h-5 px-1.5 text-[10px]">
								{groupApplications.length}
							</Badge>
						</SidebarMenuButton>
					</CollapsibleTrigger>
					<CollapsibleContent>
						<SidebarMenuSub className="border-l-0 list-none">
							{groupApplications.map((application) =>
								renderGroupedApplicationItem(application),
							)}
						</SidebarMenuSub>
					</CollapsibleContent>
				</Collapsible>
			</SidebarMenuItem>
		));

	return (
		<SidebarGroup className="flex-1">
			<SidebarGroupLabel>
				Applications
				{applications.length > 0 && (
					<Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
						{applications.length}
					</Badge>
				)}
			</SidebarGroupLabel>
			<div className="absolute right-2 top-2 flex items-center gap-0.5">
				<CreateApplicationDialog>
					<SidebarGroupAction title="New application" className="static">
						<Plus />
					</SidebarGroupAction>
				</CreateApplicationDialog>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarGroupAction title="Application view options" className="static">
							<MoreHorizontal />
						</SidebarGroupAction>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onSelect={() => void applicationStore.refetch()}>
							<RefreshCw />
							Refresh applications
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuLabel>Sort applications by</DropdownMenuLabel>
						<DropdownMenuRadioGroup
							value={`APPLICATION_SORT_${explorerSidebarStore.applicationSortField}`}
							onValueChange={handleSortChange}
						>
							{SORT_OPTIONS.map((option) => (
								<DropdownMenuRadioItem
									key={option.value}
									value={`APPLICATION_${option.value}`}
								>
									{option.label}
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
						<DropdownMenuSeparator />
						<DropdownMenuLabel>Sort company groups by</DropdownMenuLabel>
						<DropdownMenuRadioGroup
							value={`GROUP_SORT_${explorerSidebarStore.groupSortField}`}
							onValueChange={handleGroupSortChange}
						>
							{SORT_OPTIONS.map((option) => (
								<DropdownMenuRadioItem
									key={`group-${option.value}`}
									value={`GROUP_${option.value}`}
								>
									{option.label}
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
						<DropdownMenuSeparator />
						<DropdownMenuLabel>Group by</DropdownMenuLabel>
						<DropdownMenuRadioGroup
							value={
								explorerSidebarStore.groupBy
									? `GROUP_${explorerSidebarStore.groupBy.toUpperCase()}`
									: 'GROUP_NONE'
							}
							onValueChange={handleGroupChange}
						>
							{GROUP_OPTIONS.map((option) => (
								<DropdownMenuRadioItem key={option.value} value={option.value}>
									{option.label}
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
						{groupedApplications && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem onSelect={toggleAllGroups}>
									<ArrowUpDown />
									{allGroupsCollapsed
										? 'Expand all groups'
										: 'Collapse all groups'}
								</DropdownMenuItem>
							</>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			<SidebarGroupContent>
				{applications.length === 0 ? (
					<p className="px-2 text-xs text-sidebar-foreground/50">
						{searchActive ? 'No matching applications.' : 'No applications found.'}
					</p>
				) : searchActive ? (
					<SidebarMenu>
						{applications.map((application) => renderApplicationItem(application))}
					</SidebarMenu>
				) : (
					<div className="flex flex-col gap-3">
						{pinnedApplications.length > 0 && (
							<div className="flex flex-col gap-1">
								<div className={sectionLabelClass}>
									<Pin className={sectionLabelIconClass} />
									<span>Pinned</span>
								</div>
								<SidebarMenu className="gap-0.5">
									{pinnedApplications.map((application) =>
										renderApplicationItem(application),
									)}
								</SidebarMenu>
							</div>
						)}

						{recentApplications.length > 0 && (
							<div className="flex flex-col gap-1">
								<div className={sectionLabelClass}>
									<Clock3 className={sectionLabelIconClass} />
									<span>Recent</span>
								</div>
								<SidebarMenu className="gap-0.5">
									{recentApplications.map((application) =>
										renderApplicationItem(application),
									)}
								</SidebarMenu>
							</div>
						)}

						{groupedApplications && (
							<Collapsible
								open={companyBrowserOpen}
								onOpenChange={setCompanyBrowserOpen}
								className="group/company-browser"
							>
								<CollapsibleTrigger asChild>
									<SidebarMenuButton>
										<ChevronRight className="transition-transform group-data-[state=open]/company-browser:rotate-90" />
										<Building2 />
										<span>Browse by company</span>
									</SidebarMenuButton>
								</CollapsibleTrigger>
								<CollapsibleContent>
									<SidebarMenu className="mt-1">
										{renderGroupedApplications(groupedApplications)}
									</SidebarMenu>
								</CollapsibleContent>
							</Collapsible>
						)}
					</div>
				)}
			</SidebarGroupContent>
		</SidebarGroup>
	);
});

function formatApplicationUpdatedAt(updatedAt: Date | string): string {
	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
	}).format(new Date(updatedAt));
}

function formatApplicationCompany(company: string | null | undefined): string {
	const trimmed = company?.trim();
	return trimmed || 'No company';
}
