import { observer } from 'mobx-react';
import { type FC, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowUpDown, ChevronRight, FileIcon, RotateCw } from 'lucide-react';
import {
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
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
import type { Resume } from '@resume-builder/entities';
import { useStore } from '../stores/store.provider';
import { useFileManager } from './FileManager/FileManager.provider';

const SORT_OPTIONS = [
	{ value: 'SORT_NAME', label: 'Name' },
	{ value: 'SORT_DATE', label: 'Date' },
] as const;

const GROUP_OPTIONS = [
	{ value: 'GROUP_NONE', label: 'None' },
	{ value: 'GROUP_COMPANY', label: 'Company' },
	{ value: 'GROUP_LEVEL', label: 'Level' },
] as const;

const actionButtonClass =
	'flex aspect-square items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0';

export const SidebarResumeTree: FC = observer(() => {
	const navigate = useNavigate();
	const { resumeStore } = useStore();
	const { selectedApiResumeId, selectApiResume } = useFileManager();

	const resumes = resumeStore.data;
	const groupedData = resumeStore.groupedData;

	const handleSelect = useCallback(
		(resumeId: string) => {
			selectApiResume(resumeId);
			navigate({
				to: '/editor/$resumeId',
				params: { resumeId },
			});
		},
		[selectApiResume, navigate],
	);

	const handleSortChange = useCallback(
		(value: string) => {
			if (!value.startsWith('SORT_')) return;
			resumeStore.setSort(value === 'SORT_NAME' ? null : 'DATE');
		},
		[resumeStore],
	);

	const handleGroupChange = useCallback(
		(value: string) => {
			if (!value.startsWith('GROUP_')) return;
			const groupMap: Record<string, 'company' | 'level' | null> = {
				GROUP_NONE: null,
				GROUP_COMPANY: 'company',
				GROUP_LEVEL: 'level',
			};
			resumeStore.setGroupBy(groupMap[value] ?? null);
		},
		[resumeStore],
	);

	const renderResumeItem = (resume: Resume) => (
		<SidebarMenuItem key={resume._id}>
			<SidebarMenuButton
				isActive={selectedApiResumeId === resume._id}
				onClick={() => handleSelect(resume._id)}
				tooltip={resume.name}
			>
				<FileIcon />
				<span>{resume.name}</span>
			</SidebarMenuButton>
		</SidebarMenuItem>
	);

	const renderGroupedResumes = (groups: Map<string, Resume[]>) =>
		Array.from(groups.entries()).map(([groupName, groupResumes]) => (
			<SidebarMenuItem key={groupName}>
				<Collapsible defaultOpen className="group/collapsible">
					<CollapsibleTrigger asChild>
						<SidebarMenuButton>
							<ChevronRight className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
							<span>{groupName}</span>
						</SidebarMenuButton>
					</CollapsibleTrigger>
					<CollapsibleContent>
						<SidebarMenuSub>
							{groupResumes.map((resume) => (
								<SidebarMenuSubItem key={resume._id}>
									<SidebarMenuSubButton
										isActive={
											selectedApiResumeId === resume._id
										}
										onClick={() => handleSelect(resume._id)}
									>
										<span>{resume.name}</span>
									</SidebarMenuSubButton>
								</SidebarMenuSubItem>
							))}
						</SidebarMenuSub>
					</CollapsibleContent>
				</Collapsible>
			</SidebarMenuItem>
		));

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Resumes</SidebarGroupLabel>
			<div className="flex items-center gap-0.5 absolute right-2 top-2">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							title="Sort & group resumes"
							className={actionButtonClass}
						>
							<ArrowUpDown />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Sort by</DropdownMenuLabel>
						<DropdownMenuRadioGroup
							value={
								resumeStore.sortField
									? `SORT_${resumeStore.sortField}`
									: 'SORT_NAME'
							}
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
								resumeStore.groupBy
									? `GROUP_${resumeStore.groupBy.toUpperCase()}`
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
					title="Refresh resumes"
					className="static"
					onClick={() => resumeStore.refetch()}
				>
					<RotateCw />
				</SidebarGroupAction>
			</div>
			<SidebarGroupContent>
				<SidebarMenu>
					{resumes.length === 0 ? (
						<p className="px-2 text-xs text-sidebar-foreground/50">
							No resumes found.
						</p>
					) : groupedData ? (
						renderGroupedResumes(groupedData)
					) : (
						resumes.map(renderResumeItem)
					)}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
});
