import type { Application, Resume } from '@resume-builder/entities';
import { Building2, FileIcon, MoreHorizontal, Plus, RefreshCw } from 'lucide-react';
import { observer } from 'mobx-react';
import { type FC, useCallback } from 'react';

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
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
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from '@/components/ui/sidebar';

import { useStore } from '../stores/store.provider';
import { CreateApplicationDialog } from './CreateResumeDialog';

const SORT_OPTIONS = [
	{ value: 'SORT_NAME', label: 'Name' },
	{ value: 'SORT_DATE', label: 'Date' },
] as const;

type ResumeLink = Pick<Resume, '_id' | 'name' | 'updatedAt' | 'applicationId' | 'company'>;

interface CompanyResumeItem {
	application: Application;
	resume: ResumeLink;
}

export const SidebarResumeTree: FC = observer(() => {
	const { applicationStore, editorStore, explorerSidebarStore, resumeStore } = useStore();
	const { resumeData, selectedApiApplicationId } = editorStore;
	const { selectedApplicationId } = applicationStore;

	const companies = explorerSidebarStore.companies;
	const selectedCompany = explorerSidebarStore.selectedCompany;
	const applications = explorerSidebarStore.selectedCompanyApplications;
	const searchActive = Boolean(explorerSidebarStore.searchQuery.trim());
	const resumes = getCompanyResumes(applications, resumeStore.data);

	const handleApplicationSortChange = useCallback(
		(value: string) => {
			if (!value.startsWith('APPLICATION_SORT_')) return;
			explorerSidebarStore.setApplicationSort(
				value === 'APPLICATION_SORT_NAME' ? 'NAME' : 'DATE',
			);
		},
		[explorerSidebarStore],
	);

	const handleCompanySortChange = useCallback(
		(value: string) => {
			if (!value.startsWith('GROUP_SORT_')) return;
			explorerSidebarStore.setGroupSort(value === 'GROUP_SORT_NAME' ? 'NAME' : 'DATE');
		},
		[explorerSidebarStore],
	);

	const renderApplicationItem = (application: Application) => {
		const isSelected =
			selectedApplicationId === application._id ||
			selectedApiApplicationId === application._id;

		return (
			<SidebarMenuItem key={application._id}>
				<SidebarMenuButton
					size="sm"
					to="/applications/$applicationId"
					params={{ applicationId: application._id }}
					isActive={isSelected}
					onClick={() => applicationStore.selectApplication(application._id)}
					tooltip={application.name}
				>
					<FileIcon />
					<span>{application.name || 'Untitled application'}</span>
				</SidebarMenuButton>
			</SidebarMenuItem>
		);
	};

	const renderResumeItem = ({ application, resume }: CompanyResumeItem) => (
		<SidebarMenuItem key={`${application._id}:${resume._id}`}>
			<SidebarMenuButton
				size="sm"
				to="/editor/$applicationId"
				params={{ applicationId: application._id }}
				search={{ resumeId: resume._id }}
				isActive={
					selectedApiApplicationId === application._id && resumeData?._id === resume._id
				}
				onClick={() => void editorStore.selectApplication(application._id, resume._id)}
				tooltip={resume.name || 'Untitled resume'}
			>
				<FileIcon />
				<span>{resume.name || 'Untitled resume'}</span>
			</SidebarMenuButton>
		</SidebarMenuItem>
	);

	return (
		<SidebarGroup className="flex-1">
			<SidebarGroupLabel>
				Companies
				{companies.length > 0 && (
					<Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
						{companies.length}
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
						<SidebarGroupAction title="Company view options" className="static">
							<MoreHorizontal />
						</SidebarGroupAction>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onSelect={() => void applicationStore.refetch()}>
							<RefreshCw />
							Refresh applications
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuLabel>Sort companies by</DropdownMenuLabel>
						<DropdownMenuRadioGroup
							value={`GROUP_SORT_${explorerSidebarStore.groupSortField}`}
							onValueChange={handleCompanySortChange}
						>
							{SORT_OPTIONS.map((option) => (
								<DropdownMenuRadioItem
									key={`company-${option.value}`}
									value={`GROUP_${option.value}`}
								>
									{option.label}
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
						<DropdownMenuSeparator />
						<DropdownMenuLabel>Sort applications by</DropdownMenuLabel>
						<DropdownMenuRadioGroup
							value={`APPLICATION_SORT_${explorerSidebarStore.applicationSortField}`}
							onValueChange={handleApplicationSortChange}
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
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			<SidebarGroupContent className="flex flex-col gap-2">
				{companies.length === 0 ? (
					<p className="px-2 text-xs text-sidebar-foreground/50">
						{searchActive ? 'No matching companies.' : 'No companies found.'}
					</p>
				) : (
					<>
						<Select
							value={selectedCompany?.name}
							onValueChange={(companyName) =>
								explorerSidebarStore.setSelectedCompany(companyName)
							}
						>
							<SelectTrigger className="h-8 text-xs">
								<SelectValue placeholder="Select company" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{companies.map((company) => (
										<SelectItem key={company.id} value={company.name}>
											<span className="flex min-w-0 items-center gap-2">
												<Building2 />
												<span className="truncate">{company.name}</span>
												<span className="ml-auto text-muted-foreground">
													{company.applicationCount}
												</span>
											</span>
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>

						<Accordion
							type="multiple"
							defaultValue={['applications', 'resumes']}
							className="flex flex-col gap-1"
						>
							<AccordionItem value="applications" className="border-0">
								<AccordionTrigger className="px-2 py-1.5 text-xs text-sidebar-foreground/70 hover:no-underline">
									<span className="flex items-center gap-2">
										Applications
										<Badge
											variant="secondary"
											className="h-5 px-1.5 text-[10px]"
										>
											{applications.length}
										</Badge>
									</span>
								</AccordionTrigger>
								<AccordionContent className="pb-1">
									{applications.length === 0 ? (
										<p className="px-2 text-xs text-sidebar-foreground/50">
											No applications for this company.
										</p>
									) : (
										<SidebarMenu className="gap-0.5">
											{applications.map(renderApplicationItem)}
										</SidebarMenu>
									)}
								</AccordionContent>
							</AccordionItem>

							<AccordionItem value="resumes" className="border-0">
								<AccordionTrigger className="px-2 py-1.5 text-xs text-sidebar-foreground/70 hover:no-underline">
									<span className="flex items-center gap-2">
										Resumes
										<Badge
											variant="secondary"
											className="h-5 px-1.5 text-[10px]"
										>
											{resumes.length}
										</Badge>
									</span>
								</AccordionTrigger>
								<AccordionContent className="pb-1">
									{resumes.length === 0 ? (
										<p className="px-2 text-xs text-sidebar-foreground/50">
											No resumes for this company.
										</p>
									) : (
										<SidebarMenu className="gap-0.5">
											{resumes.map(renderResumeItem)}
										</SidebarMenu>
									)}
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</>
				)}
			</SidebarGroupContent>
		</SidebarGroup>
	);
});

function getCompanyResumes(
	applications: Application[],
	loadedResumes: Resume[],
): CompanyResumeItem[] {
	const applicationById = new Map(
		applications.map((application) => [application._id, application]),
	);
	const resumeItems = new Map<string, CompanyResumeItem>();

	for (const application of applications) {
		const linkedResumes = (application.resumes ?? []) as ResumeLink[];
		for (const resume of linkedResumes) {
			resumeItems.set(resume._id, { application, resume });
		}
	}

	for (const resume of loadedResumes) {
		if (!resume.applicationId) continue;

		const application = applicationById.get(resume.applicationId);
		if (!application) continue;

		resumeItems.set(resume._id, { application, resume });
	}

	return [...resumeItems.values()].sort((left, right) =>
		compareByUpdatedAtDesc(left.resume, right.resume),
	);
}

function compareByUpdatedAtDesc(left: ResumeLink, right: ResumeLink) {
	return new Date(right.updatedAt ?? 0).getTime() - new Date(left.updatedAt ?? 0).getTime();
}
