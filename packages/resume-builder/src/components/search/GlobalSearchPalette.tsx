import { useQuery } from '@apollo/client/react';
import {
	normalizeCompanyName,
	type Application,
	type Resume,
} from '@resume-builder/entities';
import { useNavigate } from '@tanstack/react-router';
import { BriefcaseBusiness, Building2, FileText } from 'lucide-react';
import { observer } from 'mobx-react';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge.tsx';
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from '@/components/ui/command.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { SEARCH_RESUMES } from '@/graphql/queries.ts';
import type {
	ResumeSearchRecord,
	SearchResumesData,
	SearchResumesVariables,
} from '@/graphql/types.ts';
import { useStore } from '@/stores/store.provider.tsx';

export const GlobalSearchPalette = observer(function GlobalSearchPalette() {
	const navigate = useNavigate();
	const { applicationStore, explorerSidebarStore, resumeStore, uiStateStore } =
		useStore();
	const [query, setQuery] = useState('');
	const [debouncedQuery, setDebouncedQuery] = useState('');
	const normalizedQuery = query.trim().toLocaleLowerCase();

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (
				(event.metaKey || event.ctrlKey) &&
				event.key.toLocaleLowerCase() === 'k'
			) {
				event.preventDefault();
				uiStateStore.setCommandPaletteOpen(!uiStateStore.commandPaletteOpen);
			}
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [uiStateStore]);

	useEffect(() => {
		const timeout = window.setTimeout(
			() => setDebouncedQuery(query.trim()),
			250,
		);
		return () => window.clearTimeout(timeout);
	}, [query]);

	const semanticSearchEnabled = debouncedQuery.length >= 2;
	const { data, loading } = useQuery<SearchResumesData, SearchResumesVariables>(
		SEARCH_RESUMES,
		{
			variables: { query: debouncedQuery, limit: 10 },
			skip: !uiStateStore.commandPaletteOpen || !semanticSearchEnabled,
		},
	);
	const searchCurrent = query.trim() === debouncedQuery;
	const resumeResults =
		searchCurrent && !loading ? (data?.searchResumes ?? []) : [];
	const applicationResults = useMemo(
		() =>
			normalizedQuery
				? applicationStore.data
						.filter((application) =>
							[application.name, application.company].some((value) =>
								value.toLocaleLowerCase().includes(normalizedQuery),
							),
						)
						.slice(0, 5)
				: [],
		[applicationStore.data, normalizedQuery],
	);
	const companyResults = useMemo(() => {
		if (!normalizedQuery) return [];
		const companies = new Map<string, number>();
		for (const application of applicationStore.data) {
			const company = normalizeCompanyName(application.company);
			if (!company.toLocaleLowerCase().includes(normalizedQuery)) continue;
			companies.set(company, (companies.get(company) ?? 0) + 1);
		}
		return [...companies.entries()].slice(0, 5);
	}, [applicationStore.data, normalizedQuery]);
	const recentResumes = useMemo(
		() =>
			[...resumeStore.data]
				.sort(
					(left, right) =>
						dateValue(right.updatedAt) - dateValue(left.updatedAt),
				)
				.slice(0, 5),
		[resumeStore.data],
	);
	const recentApplications = useMemo(
		() =>
			[...applicationStore.data]
				.sort(
					(left, right) =>
						dateValue(right.updatedAt) - dateValue(left.updatedAt),
				)
				.slice(0, 5),
		[applicationStore.data],
	);
	const close = () => {
		uiStateStore.setCommandPaletteOpen(false);
		setQuery('');
		setDebouncedQuery('');
	};
	const openResume = (resume: ResumeSearchRecord | Resume) => {
		close();
		const resumeId = 'resumeId' in resume ? resume.resumeId : resume._id;
		if (resume.applicationId) {
			void navigate({
				to: '/editor/$applicationId',
				params: { applicationId: resume.applicationId },
				search: { resumeId },
			});
			return;
		}
		void navigate({ to: '/editor/resume/$resumeId', params: { resumeId } });
	};
	const openApplication = (application: Application) => {
		close();
		applicationStore.selectApplication(application._id);
		void navigate({
			to: '/applications/$applicationId',
			params: { applicationId: application._id },
		});
	};

	const searching = normalizedQuery.length >= 2;
	const hasResults =
		resumeResults.length > 0 ||
		applicationResults.length > 0 ||
		companyResults.length > 0;

	return (
		<CommandDialog
			open={uiStateStore.commandPaletteOpen}
			onOpenChange={(open) =>
				open ? uiStateStore.setCommandPaletteOpen(true) : close()
			}
			title="Search resumes and applications"
			shouldFilter={false}
		>
			<CommandInput
				value={query}
				onValueChange={setQuery}
				placeholder="Search resumes, applications, or companies…"
			/>
			<CommandList className="max-h-[28rem]">
				{loading && searchCurrent && (
					<div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
						<Spinner />
						Searching resumes…
					</div>
				)}
				{searching && searchCurrent && !loading && !hasResults && (
					<CommandEmpty>No matching resumes or applications.</CommandEmpty>
				)}

				{normalizedQuery ? (
					<>
						{resumeResults.length > 0 && (
							<CommandGroup heading="Resumes">
								{resumeResults.map((resume) => (
									<ResumeResultItem
										key={resume.resumeId}
										resume={resume}
										onSelect={() => openResume(resume)}
									/>
								))}
							</CommandGroup>
						)}
						{applicationResults.length > 0 && (
							<>
								<CommandSeparator />
								<CommandGroup heading="Applications">
									{applicationResults.map((application) => (
										<ApplicationItem
											key={application._id}
											application={application}
											onSelect={() => openApplication(application)}
										/>
									))}
								</CommandGroup>
							</>
						)}
						{companyResults.length > 0 && (
							<>
								<CommandSeparator />
								<CommandGroup heading="Companies">
									{companyResults.map(([company, count]) => (
										<CommandItem
											key={company}
											value={`company:${company}`}
											onSelect={() => {
												explorerSidebarStore.setSelectedCompany(company);
												uiStateStore.setSidebarOpen(true);
												close();
											}}
										>
											<Building2 />
											<span className="truncate">{company}</span>
											<Badge variant="secondary" className="ml-auto">
												{count}
											</Badge>
										</CommandItem>
									))}
								</CommandGroup>
							</>
						)}
					</>
				) : (
					<>
						{recentResumes.length > 0 && (
							<CommandGroup heading="Recent resumes">
								{recentResumes.map((resume) => (
									<CommandItem
										key={resume._id}
										value={`resume:${resume._id}`}
										onSelect={() => openResume(resume)}
									>
										<FileText />
										<span className="truncate">
											{resume.name || 'Untitled resume'}
										</span>
										<Badge variant="secondary" className="ml-auto">
											{resume.base ? 'Base' : 'Application'}
										</Badge>
									</CommandItem>
								))}
							</CommandGroup>
						)}
						{recentApplications.length > 0 && (
							<>
								<CommandSeparator />
								<CommandGroup heading="Recent applications">
									{recentApplications.map((application) => (
										<ApplicationItem
											key={application._id}
											application={application}
											onSelect={() => openApplication(application)}
										/>
									))}
								</CommandGroup>
							</>
						)}
					</>
				)}
			</CommandList>
		</CommandDialog>
	);
});

function ResumeResultItem({
	resume,
	onSelect,
}: {
	resume: ResumeSearchRecord;
	onSelect: () => void;
}) {
	return (
		<CommandItem value={`resume:${resume.resumeId}`} onSelect={onSelect}>
			<FileText />
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex items-center gap-2">
					<span className="truncate font-medium">
						{resume.name || 'Untitled resume'}
					</span>
					<Badge variant="secondary">
						{resume.base ? 'Base' : 'Application'}
					</Badge>
				</div>
				<div className="truncate text-xs text-muted-foreground">
					{[resume.company, resume.summary?.dominantTheme]
						.filter(Boolean)
						.join(' · ')}
				</div>
				{resume.matches.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{resume.matches.map((match) => (
							<Badge key={`${match.kind}:${match.label}`} variant="outline">
								{match.label}
							</Badge>
						))}
					</div>
				)}
			</div>
		</CommandItem>
	);
}

function ApplicationItem({
	application,
	onSelect,
}: {
	application: Application;
	onSelect: () => void;
}) {
	return (
		<CommandItem value={`application:${application._id}`} onSelect={onSelect}>
			<BriefcaseBusiness />
			<div className="flex min-w-0 flex-col">
				<span className="truncate">
					{application.name || 'Untitled application'}
				</span>
				<span className="truncate text-xs text-muted-foreground">
					{application.company}
				</span>
			</div>
		</CommandItem>
	);
}

function dateValue(value: string | Date | undefined): number {
	return new Date(value ?? 0).getTime();
}
