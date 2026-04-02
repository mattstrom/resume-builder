import { observer } from 'mobx-react';
import { type FC, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
	ArrowUpDown,
	ChevronRight,
	FileIcon,
	Plus,
	RotateCw,
} from 'lucide-react';
import {
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Application } from '@resume-builder/entities';
import { useStore } from '../stores/store.provider';
import { useFileManager } from './FileManager/FileManager.provider';
import { CreateApplicationDialog } from './CreateResumeDialog';

const SORT_OPTIONS = [
	{ value: 'SORT_NAME', label: 'Name' },
	{ value: 'SORT_DATE', label: 'Date' },
] as const;

const GROUP_OPTIONS = [
	{ value: 'GROUP_NONE', label: 'None' },
	{ value: 'GROUP_COMPANY', label: 'Company' },
] as const;

const actionButtonClass =
	'flex aspect-square items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0';

export const SidebarResumeTree: FC = observer(() => {
	const navigate = useNavigate();
	const { applicationStore } = useStore();
	const { selectedApiApplicationId, selectApiApplication } = useFileManager();

	const applications = applicationStore.data;
	const groupedData = applicationStore.groupedData;

	const handleSelect = useCallback(
		(applicationId: string) => {
			void selectApiApplication(applicationId);
			navigate({
				to: '/editor/$applicationId',
				params: { applicationId },
			});
		},
		[selectApiApplication, navigate],
	);

	const handleSortChange = useCallback(
		(value: string) => {
			if (!value.startsWith('SORT_')) return;
			applicationStore.setSort(value === 'SORT_NAME' ? 'NAME' : 'DATE');
		},
		[applicationStore],
	);

	const handleGroupChange = useCallback(
		(value: string) => {
			if (!value.startsWith('GROUP_')) return;
			const groupMap: Record<string, 'company' | null> = {
				GROUP_NONE: null,
				GROUP_COMPANY: 'company',
			};
			applicationStore.setGroupBy(groupMap[value] ?? null);
		},
		[applicationStore],
	);

	const renderApplicationItem = (application: Application) => (
		<SidebarMenuItem key={application._id}>
			<SidebarMenuButton
				isActive={selectedApiApplicationId === application._id}
				onClick={() => handleSelect(application._id)}
				tooltip={application.name}
			>
				<FileIcon />
				<span>{application.name}</span>
			</SidebarMenuButton>
		</SidebarMenuItem>
	);

	const renderGroupedApplications = (groups: Map<string, Application[]>) =>
		Array.from(groups.entries()).map(([groupName, groupApplications]) => (
			<SidebarMenuItem key={groupName}>
				<Collapsible defaultOpen className="group/collapsible">
					<CollapsibleTrigger asChild>
						<SidebarMenuButton>
							<ChevronRight className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
							<span>{groupName}</span>
						</SidebarMenuButton>
					</CollapsibleTrigger>
					<CollapsibleContent>
						<SidebarMenuSub className="border-l-0">
							{groupApplications.map((application) => (
								<SidebarMenuSubItem key={application._id}>
									<SidebarMenuButton
										size="sm"
										isActive={
											selectedApiApplicationId ===
											application._id
										}
										onClick={() =>
											handleSelect(application._id)
										}
										tooltip={application.name}
									>
										<FileIcon />
										<span>{application.name}</span>
									</SidebarMenuButton>
								</SidebarMenuSubItem>
							))}
						</SidebarMenuSub>
					</CollapsibleContent>
				</Collapsible>
			</SidebarMenuItem>
		));

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Applications</SidebarGroupLabel>
			<div className="flex items-center gap-0.5 absolute right-2 top-2">
				<CreateApplicationDialog>
					<button
						title="New application"
						className={actionButtonClass}
					>
						<Plus />
					</button>
				</CreateApplicationDialog>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							title="Sort & group applications"
							className={actionButtonClass}
						>
							<ArrowUpDown />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Sort by</DropdownMenuLabel>
						<DropdownMenuRadioGroup
							value={`SORT_${applicationStore.sortField}`}
							onValueChange={handleSortChange}
						>
							{SORT_OPTIONS.map((option) => (
								<DropdownMenuRadioItem
									key={option.value}
									value={option.value}
								>
									{option.label}
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
						<DropdownMenuSeparator />
						<DropdownMenuLabel>Group by</DropdownMenuLabel>
						<DropdownMenuRadioGroup
							value={
								applicationStore.groupBy
									? `GROUP_${applicationStore.groupBy.toUpperCase()}`
									: 'GROUP_NONE'
							}
							onValueChange={handleGroupChange}
						>
							{GROUP_OPTIONS.map((option) => (
								<DropdownMenuRadioItem
									key={option.value}
									value={option.value}
								>
									{option.label}
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
					</DropdownMenuContent>
				</DropdownMenu>
				<SidebarGroupAction
					title="Refresh applications"
					className="static"
					onClick={() => applicationStore.refetch()}
				>
					<RotateCw />
				</SidebarGroupAction>
			</div>
			<SidebarGroupContent>
				<SidebarMenu>
					{applications.length === 0 ? (
						<p className="px-2 text-xs text-sidebar-foreground/50">
							No applications found.
						</p>
					) : groupedData ? (
						renderGroupedApplications(groupedData)
					) : (
						applications.map(renderApplicationItem)
					)}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
});
