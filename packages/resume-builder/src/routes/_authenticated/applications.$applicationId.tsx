import { useMutation, useQuery } from '@apollo/client/react';
import type { Application, Resume } from '@resume-builder/entities';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
	AlertCircle,
	ArrowRight,
	CheckCircle2,
	CopyPlus,
	ExternalLink,
	FileCheck2,
	FileText,
	Save,
	Sparkles,
	Trash2,
} from 'lucide-react';
import { observer } from 'mobx-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { AppShell } from '@/components/app-shell/AppShell.tsx';
import { RouteError } from '@/components/RouteError.tsx';
import { RouteLoading } from '@/components/RouteLoading.tsx';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card.tsx';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Progress } from '@/components/ui/progress.tsx';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { CREATE_BLANK_RESUME, DELETE_RESUME, UPDATE_APPLICATION } from '@/graphql/mutations.ts';
import { GET_APPLICATION, GET_JOB_REQUIREMENTS } from '@/graphql/queries.ts';
import type {
	CreateBlankResumeData,
	CreateBlankResumeVariables,
	DeleteResumeData,
	DeleteResumeVariables,
	GetApplicationData,
	GetApplicationVariables,
	GetJobRequirementsData,
	GetJobRequirementsVariables,
	UpdateApplicationData,
	UpdateApplicationVariables,
} from '@/graphql/types.ts';
import {
	deriveApplicationWorkflow,
	WORKFLOW_STAGE_IDS,
	type WorkflowStage,
	type WorkflowStageId,
	type WorkflowStageStatus,
} from '@/lib/application-workflow.ts';
import { cn } from '@/lib/utils.ts';
import { useStore } from '@/stores/store.provider.tsx';

type ApplicationFormState = {
	name: string;
	company: string;
	jobPostingUrl: string;
	jobDescription: string;
	notionId: string;
	coverLetterId: string;
	notes: string;
};

type ResumeLink = Pick<Resume, '_id' | 'name' | 'updatedAt'>;

const applicationSearchSchema = z
	.object({
		stage: z.enum(WORKFLOW_STAGE_IDS).optional().default('posting'),
	})
	.catch({ stage: 'posting' });

const statusLabels: Record<WorkflowStageStatus, string> = {
	empty: 'Empty',
	ready: 'Ready',
	inProgress: 'In progress',
	complete: 'Complete',
	blocked: 'Blocked',
};

const requirementKindLabels: Record<string, string> = {
	required: 'Required',
	preferred: 'Preferred',
	responsibility: 'Responsibilities',
	culture: 'Ways of working',
};

const getInitialFormState = (application: Application): ApplicationFormState => ({
	name: application.name ?? '',
	company: application.company ?? '',
	jobPostingUrl: application.jobPostingUrl ?? '',
	jobDescription: application.jobDescription ?? '',
	notionId: application.notionId ?? '',
	coverLetterId: application.coverLetterId ?? '',
	notes: application.notes ?? '',
});

function optionalValue(value: string) {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function formatDate(value?: string | Date | null) {
	if (!value) return 'No activity yet';
	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	}).format(new Date(value));
}

function getStatusVariant(status: WorkflowStageStatus) {
	if (status === 'complete') return 'default';
	if (status === 'blocked') return 'destructive';
	if (status === 'ready' || status === 'inProgress') return 'secondary';
	return 'outline';
}

function StageStatusBadge({ status }: { status: WorkflowStageStatus }) {
	return <Badge variant={getStatusVariant(status)}>{statusLabels[status]}</Badge>;
}

function formatQualifier(
	qualifier: GetJobRequirementsData['jobRequirements'][number]['concepts'][number]['qualifier'],
) {
	if (!qualifier) return '';
	const formatValue = (value: number) => {
		if (qualifier.unit === 'months' && value % 12 === 0) {
			const years = value / 12;
			return `${years} ${years === 1 ? 'year' : 'years'}`;
		}
		return `${value} ${qualifier.unit}`;
	};
	const dimension = qualifier.dimension.replaceAll('-', ' ');
	if (
		qualifier.operator === 'between' &&
		qualifier.min !== undefined &&
		qualifier.max !== undefined
	) {
		return ` · ${formatValue(qualifier.min)}–${formatValue(qualifier.max)} ${dimension}`;
	}
	if (qualifier.value === undefined) return '';
	const operator = {
		gte: '≥',
		gt: '>',
		eq: '=',
		lte: '≤',
		lt: '<',
		approximately: '≈',
	}[qualifier.operator];
	return ` · ${operator ?? qualifier.operator} ${formatValue(qualifier.value)} ${dimension}`;
}

function WorkflowStageTrigger({ stage }: { stage: WorkflowStage }) {
	return (
		<TabsTrigger
			value={stage.id}
			className="h-auto min-h-14 flex-1 flex-col items-start gap-1 px-3 py-2 text-left"
		>
			<span className="flex w-full items-center justify-between gap-2">
				<span className="truncate text-sm font-medium">{stage.label}</span>
				<StageStatusBadge status={stage.status} />
			</span>
			<span className="line-clamp-1 text-xs text-muted-foreground">{stage.actionLabel}</span>
		</TabsTrigger>
	);
}

function CreateWorkflowResumeDialog({
	application,
	onCreated,
}: {
	application: Application;
	onCreated: (resume: Resume) => Promise<void>;
}) {
	const { editorStore } = useStore();
	const [open, setOpen] = useState(false);
	const [creating, setCreating] = useState(false);
	const [baseResumeId, setBaseResumeId] = useState('blank');
	const [createBlankResume] = useMutation<CreateBlankResumeData, CreateBlankResumeVariables>(
		CREATE_BLANK_RESUME,
	);

	const openDialog = () => {
		setBaseResumeId('blank');
		void editorStore.loadBaseResumes();
		setOpen(true);
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const name = (new FormData(event.currentTarget).get('name') as string).trim();
		if (!name) return;

		setCreating(true);
		try {
			const result = await createBlankResume({
				variables: {
					resumeData: {
						name,
						company: application.company,
						jobPostingUrl: application.jobPostingUrl,
						base: false,
						applicationId: application._id,
						sourceResumeId: baseResumeId === 'blank' ? undefined : baseResumeId,
					},
				},
			});
			const resume = result.data?.createBlankResume;
			if (resume) {
				await onCreated(resume);
				setOpen(false);
				toast.success('Resume created');
			}
		} finally {
			setCreating(false);
		}
	};

	return (
		<>
			<Button onClick={openDialog}>
				<FileText data-icon="inline-start" />
				Create resume
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create application resume</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
						<div className="flex flex-col gap-2">
							<Label htmlFor="resume-name">Name</Label>
							<Input
								id="resume-name"
								name="name"
								defaultValue={`${application.name || 'Application'} Resume`}
								required
								autoFocus
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="base-resume">Base resume</Label>
							<Select value={baseResumeId} onValueChange={setBaseResumeId}>
								<SelectTrigger id="base-resume">
									<SelectValue placeholder="Blank resume" />
								</SelectTrigger>
								<SelectContent position="item-aligned">
									<SelectGroup>
										<SelectItem value="blank">Blank resume</SelectItem>
										{editorStore.baseResumes
											.filter((resume) => resume._id)
											.map((resume) => (
												<SelectItem key={resume._id} value={resume._id}>
													{resume.name || 'Untitled resume'}
												</SelectItem>
											))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>
						<DialogFooter>
							<Button type="submit" disabled={creating}>
								{creating ? 'Creating...' : 'Create resume'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</>
	);
}

function DuplicateResumeDialog({
	application,
	resume,
	onCreated,
}: {
	application: Application;
	resume: ResumeLink;
	onCreated: (resume: Resume) => Promise<void>;
}) {
	const [open, setOpen] = useState(false);
	const [duplicating, setDuplicating] = useState(false);
	const [createBlankResume] = useMutation<CreateBlankResumeData, CreateBlankResumeVariables>(
		CREATE_BLANK_RESUME,
	);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const name = (new FormData(event.currentTarget).get('name') as string).trim();
		if (!name) return;

		setDuplicating(true);
		try {
			const result = await createBlankResume({
				variables: {
					resumeData: {
						name,
						company: application.company,
						jobPostingUrl: application.jobPostingUrl,
						base: false,
						applicationId: application._id,
						sourceResumeId: resume._id,
					},
				},
			});
			const duplicatedResume = result.data?.createBlankResume;
			if (duplicatedResume) {
				await onCreated(duplicatedResume);
				setOpen(false);
				toast.success('Resume duplicated');
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to duplicate resume');
		} finally {
			setDuplicating(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<Button variant="outline" size="sm" onClick={() => setOpen(true)}>
				<CopyPlus data-icon="inline-start" />
				Duplicate
			</Button>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Duplicate resume</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor={`duplicate-resume-name-${resume._id}`}>Name</Label>
						<Input
							id={`duplicate-resume-name-${resume._id}`}
							name="name"
							defaultValue={`${resume.name || 'Untitled resume'} (copy)`}
							required
							autoFocus
						/>
					</div>
					<DialogFooter>
						<Button type="submit" disabled={duplicating}>
							{duplicating ? 'Duplicating...' : 'Duplicate resume'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function DeleteResumeDialog({
	resume,
	onDeleted,
}: {
	resume: ResumeLink;
	onDeleted: () => Promise<void>;
}) {
	const [open, setOpen] = useState(false);
	const [deleteResume, { loading: deleting }] = useMutation<
		DeleteResumeData,
		DeleteResumeVariables
	>(DELETE_RESUME);

	const handleDelete = async () => {
		try {
			await deleteResume({ variables: { id: resume._id } });
			await onDeleted();
			setOpen(false);
			toast.success('Resume deleted');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to delete resume');
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<Button
				variant="outline"
				size="sm"
				onClick={() => setOpen(true)}
				aria-label={`Delete ${resume.name || 'untitled resume'}`}
			>
				<Trash2 data-icon="inline-start" />
				Delete
			</Button>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete resume?</DialogTitle>
					<DialogDescription>
						{`“${resume.name || 'Untitled resume'}” will be permanently deleted. This action cannot be undone.`}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
						Cancel
					</Button>
					<Button variant="destructive" onClick={handleDelete} disabled={deleting}>
						{deleting ? 'Deleting...' : 'Delete resume'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

const ApplicationRouteComponent = observer(function ApplicationRouteComponent() {
	const { applicationId } = Route.useParams();
	const { stage: selectedStage } = Route.useSearch();
	const { application: loadedApplication } = Route.useLoaderData();
	const { applicationStore, client, resumeStore } = useStore();
	const navigate = Route.useNavigate();
	const [application, setApplication] = useState<Application>(loadedApplication);
	const [formState, setFormState] = useState(() => getInitialFormState(loadedApplication));
	const [identifyingRequirements, setIdentifyingRequirements] = useState(false);
	const {
		data: jobRequirementsData,
		loading: loadingJobRequirements,
		refetch: refetchJobRequirements,
	} = useQuery<GetJobRequirementsData, GetJobRequirementsVariables>(GET_JOB_REQUIREMENTS, {
		variables: { applicationId },
		fetchPolicy: 'cache-and-network',
	});
	const [updateApplication, { loading: saving }] = useMutation<
		UpdateApplicationData,
		UpdateApplicationVariables
	>(UPDATE_APPLICATION);

	const jobRequirements = jobRequirementsData?.jobRequirements ?? [];
	const workflow = useMemo(
		() => deriveApplicationWorkflow(application, jobRequirements.length > 0),
		[application, jobRequirements.length],
	);
	const requirementsStage = workflow.stages.find((stage) => stage.id === 'requirements')!;
	const assertions = useMemo(
		() => jobRequirements.flatMap((requirement) => requirement.concepts),
		[jobRequirements],
	);
	const resumes = (application.resumes ?? []) as ResumeLink[];
	const firstResume = resumes[0];

	useEffect(() => {
		setApplication(loadedApplication);
		setFormState(getInitialFormState(loadedApplication));
		document.title = loadedApplication.name
			? `${loadedApplication.name} - Application`
			: 'Application';

		return () => {
			document.title = 'Resume Builder';
		};
	}, [loadedApplication]);

	const refreshApplication = async () => {
		const result = await client.query<GetApplicationData, GetApplicationVariables>({
			query: GET_APPLICATION,
			variables: { id: applicationId },
			fetchPolicy: 'network-only',
		});
		const refreshed = result.data?.getApplication;
		if (refreshed) {
			setApplication(refreshed);
			setFormState(getInitialFormState(refreshed));
		}
		await applicationStore.refetch();
		return refreshed;
	};

	const updateField =
		(field: keyof ApplicationFormState) =>
		(value: string): void => {
			setFormState((current) => ({ ...current, [field]: value }));
		};

	const saveApplication = async (showToast = true) => {
		const result = await updateApplication({
			variables: {
				id: applicationId,
				applicationData: {
					name: formState.name.trim(),
					company: formState.company.trim(),
					jobPostingUrl: formState.jobPostingUrl.trim(),
					jobDescription: optionalValue(formState.jobDescription),
					notionId: optionalValue(formState.notionId),
					coverLetterId: optionalValue(formState.coverLetterId),
					notes: optionalValue(formState.notes),
				},
			},
		});

		const updated = result.data?.updateApplication;
		if (updated) {
			setApplication(updated);
			setFormState(getInitialFormState(updated));
		}
		await applicationStore.refetch();
		if (showToast) {
			toast.success('Application updated');
		}
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		await saveApplication();
	};

	const handleStageChange = (stage: WorkflowStageId) => {
		void navigate({
			search: (previous) => ({ ...previous, stage }),
		});
	};

	const handleIdentifyRequirements = async () => {
		setIdentifyingRequirements(true);
		try {
			await saveApplication(false);
			await applicationStore.identifyJobConcepts(applicationId);
			await refetchJobRequirements();
			handleStageChange('requirements');
			toast.success('Job requirements identified.');
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Requirement identification failed',
			);
		} finally {
			setIdentifyingRequirements(false);
		}
	};

	const handleResumeCreated = async (_resume: Resume) => {
		await Promise.all([refreshApplication(), resumeStore.refetch()]);
	};

	const handleResumeDeleted = async () => {
		await Promise.all([refreshApplication(), resumeStore.refetch()]);
	};

	const reviewWarnings = [
		!workflow.hasPosting ? 'Posting details are missing.' : null,
		!workflow.hasJobDescription ? 'The job description text is missing.' : null,
		!workflow.hasRequirements ? 'Job requirements have not been identified.' : null,
		!workflow.hasResume ? 'No resume is linked to this application.' : null,
		!workflow.hasCoverLetter ? 'No cover letter artifact is tracked.' : null,
	].filter(Boolean);

	return (
		<AppShell>
			<main className="min-h-full overflow-auto bg-background">
				<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 md:px-8">
					<header className="flex flex-col gap-4">
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div className="flex min-w-0 flex-col gap-2">
								<p className="text-sm text-muted-foreground">
									Application workflow
								</p>
								<h1 className="truncate text-3xl font-semibold tracking-tight">
									{application.name || 'Untitled application'}
								</h1>
								<div className="flex flex-wrap items-center gap-2">
									<Badge variant="secondary">
										{application.company || 'No company'}
									</Badge>
									<Badge variant="outline">
										Updated {formatDate(application.updatedAt)}
									</Badge>
								</div>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								{firstResume && (
									<Button variant="outline" asChild>
										<Link
											to="/editor/$applicationId"
											params={{ applicationId }}
											search={{ resumeId: firstResume._id }}
										>
											Open resume
											<ArrowRight data-icon="inline-end" />
										</Link>
									</Button>
								)}
								<Button
									variant="outline"
									onClick={handleIdentifyRequirements}
									disabled={
										!workflow.hasJobDescription || identifyingRequirements
									}
								>
									<Sparkles data-icon="inline-start" />
									{identifyingRequirements
										? 'Identifying...'
										: requirementsStage.actionLabel}
								</Button>
							</div>
						</div>

						<Card>
							<CardHeader className="pb-3">
								<div className="flex flex-wrap items-center justify-between gap-3">
									<div>
										<CardTitle>Workflow progress</CardTitle>
										<CardDescription>
											{workflow.completedCount} of {workflow.totalCount}{' '}
											artifact stages complete
										</CardDescription>
									</div>
									<Badge variant="outline">{workflow.progress}%</Badge>
								</div>
							</CardHeader>
							<CardContent className="flex flex-col gap-4">
								<Progress value={workflow.progress} />
								<Tabs
									value={selectedStage}
									onValueChange={(value) =>
										handleStageChange(value as WorkflowStageId)
									}
								>
									<TabsList className="h-auto w-full items-stretch justify-start gap-1 bg-muted/50 p-1">
										{workflow.stages.map((stage) => (
											<WorkflowStageTrigger key={stage.id} stage={stage} />
										))}
									</TabsList>
								</Tabs>
							</CardContent>
						</Card>
					</header>

					<Tabs
						value={selectedStage}
						onValueChange={(value) => handleStageChange(value as WorkflowStageId)}
						className="flex flex-col gap-4"
					>
						<TabsContent value="posting" className="mt-0">
							<form onSubmit={handleSubmit} className="flex flex-col gap-4">
								<Card>
									<CardHeader>
										<CardTitle>Posting</CardTitle>
										<CardDescription>
											Capture the source material used for requirement
											identification, tailoring, and final review.
										</CardDescription>
									</CardHeader>
									<CardContent className="flex flex-col gap-5">
										<div className="grid gap-5 md:grid-cols-2">
											<div className="flex flex-col gap-2">
												<Label htmlFor="application-name">Name</Label>
												<Input
													id="application-name"
													value={formState.name}
													onChange={(event) =>
														updateField('name')(event.target.value)
													}
													placeholder="Frontend Engineer"
													required
												/>
											</div>
											<div className="flex flex-col gap-2">
												<Label htmlFor="application-company">Company</Label>
												<Input
													id="application-company"
													value={formState.company}
													onChange={(event) =>
														updateField('company')(event.target.value)
													}
													placeholder="Acme Corp"
													required
												/>
											</div>
										</div>

										<div className="grid gap-5 md:grid-cols-2">
											<div className="flex flex-col gap-2">
												<Label htmlFor="application-job-posting-url">
													Job Posting URL
												</Label>
												<Input
													id="application-job-posting-url"
													type="url"
													value={formState.jobPostingUrl}
													onChange={(event) =>
														updateField('jobPostingUrl')(
															event.target.value,
														)
													}
													placeholder="https://example.com/job/123"
												/>
											</div>
											<div className="flex flex-col gap-2">
												<Label htmlFor="application-notion-id">
													Notion ID
												</Label>
												<Input
													id="application-notion-id"
													value={formState.notionId}
													onChange={(event) =>
														updateField('notionId')(event.target.value)
													}
													placeholder="Notion page or database record ID"
												/>
											</div>
										</div>

										<div className="flex flex-col gap-2">
											<Label htmlFor="application-job-description">
												Job Description
											</Label>
											<Textarea
												id="application-job-description"
												value={formState.jobDescription}
												onChange={(event) =>
													updateField('jobDescription')(
														event.target.value,
													)
												}
												placeholder="Paste the job posting text here"
												className="min-h-72"
											/>
										</div>

										<div className="flex flex-col gap-2">
											<Label htmlFor="application-notes">Notes</Label>
											<Textarea
												id="application-notes"
												value={formState.notes}
												onChange={(event) =>
													updateField('notes')(event.target.value)
												}
												placeholder="Interview notes, recruiter details, or next steps"
												className="min-h-32"
											/>
										</div>
									</CardContent>
									<CardFooter className="justify-end">
										<Button type="submit" disabled={saving}>
											<Save data-icon="inline-start" />
											{saving ? 'Saving...' : 'Save posting'}
										</Button>
									</CardFooter>
								</Card>
							</form>
						</TabsContent>

						<TabsContent value="requirements" className="mt-0">
							<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
								<Card>
									<CardHeader>
										<CardTitle>Job requirements</CardTitle>
										<CardDescription>
											Distill the posting into semantic assertions that share
											concepts with your career evidence.
										</CardDescription>
									</CardHeader>
									<CardContent className="flex flex-col gap-5">
										{!workflow.hasJobDescription && (
											<Alert>
												<AlertCircle />
												<AlertTitle>Posting required</AlertTitle>
												<AlertDescription>
													Add a job description before identifying
													requirements.
												</AlertDescription>
											</Alert>
										)}

										{jobRequirements.length > 0 ? (
											Object.entries(requirementKindLabels).map(
												([kind, label]) => {
													const requirements = jobRequirements.filter(
														(requirement) => requirement.kind === kind,
													);
													if (requirements.length === 0) return null;

													return (
														<section
															key={kind}
															className="flex flex-col gap-2"
														>
															<div className="flex items-center justify-between gap-3">
																<h3 className="text-sm font-medium">
																	{label}
																</h3>
																<Badge variant="outline">
																	{requirements.length}
																</Badge>
															</div>
															<div className="flex flex-col gap-2">
																{requirements.map((requirement) => (
																	<div
																		key={requirement.id}
																		className="flex flex-col gap-2 rounded-md border border-border px-3 py-2"
																	>
																		<p className="text-sm">
																			{requirement.what}
																		</p>
																		{requirement.concepts
																			.length > 0 && (
																			<div className="flex flex-wrap gap-1">
																				{requirement.concepts.map(
																					(assertion) => (
																						<Badge
																							key={`${assertion.relation}:${assertion.conceptId}`}
																							variant="secondary"
																						>
																							{
																								assertion.relation
																							}
																							:{' '}
																							{
																								assertion
																									.concept
																									.label
																							}
																							{formatQualifier(
																								assertion.qualifier,
																							)}
																						</Badge>
																					),
																				)}
																			</div>
																		)}
																	</div>
																))}
															</div>
														</section>
													);
												},
											)
										) : (
											<Alert>
												<Sparkles />
												<AlertTitle>
													{loadingJobRequirements
														? 'Loading identified requirements'
														: 'No requirements identified yet'}
												</AlertTitle>
												<AlertDescription>
													The AI will break the posting into explicit
													requirements, responsibilities, and
													working-style signals.
												</AlertDescription>
											</Alert>
										)}
									</CardContent>
									<CardFooter>
										<Button
											onClick={handleIdentifyRequirements}
											disabled={
												!workflow.hasJobDescription ||
												identifyingRequirements
											}
										>
											<Sparkles data-icon="inline-start" />
											{identifyingRequirements
												? 'Identifying...'
												: requirementsStage.actionLabel}
										</Button>
									</CardFooter>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle>Assertion index</CardTitle>
										<CardDescription>
											Normalized job-side predicates pointing into the shared
											concept graph.
										</CardDescription>
									</CardHeader>
									<CardContent className="flex flex-col gap-5">
										<section className="flex flex-col gap-2">
											<h3 className="text-sm font-medium">Assertions</h3>
											<div className="flex flex-wrap gap-2">
												{assertions.length > 0 ? (
													assertions.map((assertion) => (
														<Badge
															key={`${assertion.jobRequirementId}:${assertion.relation}:${assertion.conceptId}`}
															variant="secondary"
														>
															{assertion.relation}:{' '}
															{assertion.concept.label}
														</Badge>
													))
												) : (
													<p className="text-sm text-muted-foreground">
														No assertions identified.
													</p>
												)}
											</div>
										</section>
										<Separator />
										<section className="flex flex-col gap-2">
											<h3 className="text-sm font-medium">
												Quantified constraints
											</h3>
											<div className="flex flex-wrap gap-2">
												{assertions.some(
													(assertion) => assertion.qualifier,
												) ? (
													assertions
														.filter((assertion) => assertion.qualifier)
														.map((assertion) => (
															<Badge
																key={`${assertion.jobRequirementId}:${assertion.relation}:${assertion.conceptId}:qualifier`}
																variant="outline"
															>
																{assertion.concept.label}
																{formatQualifier(
																	assertion.qualifier,
																)}
															</Badge>
														))
												) : (
													<p className="text-sm text-muted-foreground">
														No quantified constraints identified.
													</p>
												)}
											</div>
										</section>
									</CardContent>
								</Card>
							</div>
						</TabsContent>

						<TabsContent value="resume" className="mt-0">
							<Card>
								<CardHeader>
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div>
											<CardTitle>Resume</CardTitle>
											<CardDescription>
												Create, clone, and open resumes linked to this
												application.
											</CardDescription>
										</div>
										<CreateWorkflowResumeDialog
											application={application}
											onCreated={handleResumeCreated}
										/>
									</div>
								</CardHeader>
								<CardContent className="flex flex-col gap-3">
									{resumes.length > 0 ? (
										resumes.map((resume) => (
											<div
												key={resume._id}
												className="group relative flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 transition-colors hover:bg-muted/50"
											>
												<Link
													to="/editor/$applicationId"
													params={{ applicationId }}
													search={{ resumeId: resume._id }}
													className="absolute inset-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
													aria-label={`Open ${resume.name || 'untitled resume'}`}
												/>
												<div className="pointer-events-none flex min-w-0 items-center gap-3">
													<FileText />
													<div className="flex min-w-0 flex-col">
														<span className="truncate text-sm font-medium">
															{resume.name || 'Untitled resume'}
														</span>
														<span className="text-xs text-muted-foreground">
															Updated {formatDate(resume.updatedAt)}
														</span>
													</div>
												</div>
												<div className="relative z-10 flex shrink-0 items-center gap-2">
													<DuplicateResumeDialog
														application={application}
														resume={resume}
														onCreated={handleResumeCreated}
													/>
													<DeleteResumeDialog
														resume={resume}
														onDeleted={handleResumeDeleted}
													/>
												</div>
											</div>
										))
									) : (
										<Alert>
											<AlertCircle />
											<AlertTitle>No linked resume</AlertTitle>
											<AlertDescription>
												Create a new application resume or clone from a base
												resume to begin tailoring.
											</AlertDescription>
										</Alert>
									)}
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="coverLetter" className="mt-0">
							<form onSubmit={handleSubmit} className="flex flex-col gap-4">
								<Card>
									<CardHeader>
										<CardTitle>Cover Letter</CardTitle>
										<CardDescription>
											Track the cover letter artifact for this application.
											Generation and editing can attach here later.
										</CardDescription>
									</CardHeader>
									<CardContent className="flex flex-col gap-4">
										<div className="flex flex-col gap-2">
											<Label htmlFor="application-cover-letter-id">
												Cover Letter ID
											</Label>
											<Input
												id="application-cover-letter-id"
												value={formState.coverLetterId}
												onChange={(event) =>
													updateField('coverLetterId')(event.target.value)
												}
												placeholder="Cover letter document ID"
											/>
										</div>
										<Alert>
											<FileCheck2 />
											<AlertTitle>Placeholder-ready artifact</AlertTitle>
											<AlertDescription>
												This stage stays lightweight for v1. Store an
												existing document ID here without adding new backend
												workflow state.
											</AlertDescription>
										</Alert>
									</CardContent>
									<CardFooter className="justify-end">
										<Button type="submit" disabled={saving}>
											<Save data-icon="inline-start" />
											{saving ? 'Saving...' : 'Save cover letter ID'}
										</Button>
									</CardFooter>
								</Card>
							</form>
						</TabsContent>

						<TabsContent value="review" className="mt-0">
							<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)]">
								<Card>
									<CardHeader>
										<CardTitle>Final Review</CardTitle>
										<CardDescription>
											Confirm the application package before exporting or
											submitting.
										</CardDescription>
									</CardHeader>
									<CardContent className="flex flex-col gap-4">
										{reviewWarnings.length > 0 ? (
											<Alert>
												<AlertCircle />
												<AlertTitle>Review blockers</AlertTitle>
												<AlertDescription>
													<ul className="list-disc pl-4">
														{reviewWarnings.map((warning) => (
															<li key={warning}>{warning}</li>
														))}
													</ul>
												</AlertDescription>
											</Alert>
										) : (
											<Alert>
												<CheckCircle2 />
												<AlertTitle>Ready for review</AlertTitle>
												<AlertDescription>
													Posting, requirements, and resume are ready for
													a final pass.
												</AlertDescription>
											</Alert>
										)}

										<div className="grid gap-3 md:grid-cols-2">
											{workflow.stages.map((stage) => (
												<div
													key={stage.id}
													className={cn(
														'flex flex-col gap-2 rounded-md border border-border px-3 py-3',
														stage.id === 'review' && 'md:col-span-2',
													)}
												>
													<div className="flex items-center justify-between gap-3">
														<span className="text-sm font-medium">
															{stage.label}
														</span>
														<StageStatusBadge status={stage.status} />
													</div>
													<p className="text-sm text-muted-foreground">
														{stage.description}
													</p>
												</div>
											))}
										</div>
									</CardContent>
									<CardFooter className="flex flex-wrap gap-2">
										{firstResume && (
											<>
												<Button asChild>
													<Link
														to="/editor/$applicationId"
														params={{ applicationId }}
														search={{ resumeId: firstResume._id }}
													>
														Open editor
													</Link>
												</Button>
												<Button variant="outline" asChild>
													<Link
														to="/preview/$applicationId"
														params={{ applicationId }}
														search={{ resumeId: firstResume._id }}
													>
														Preview
													</Link>
												</Button>
												<Button variant="outline" asChild>
													<Link
														to="/export/$applicationId"
														params={{ applicationId }}
													>
														Export
														<ExternalLink data-icon="inline-end" />
													</Link>
												</Button>
											</>
										)}
									</CardFooter>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle>Package summary</CardTitle>
										<CardDescription>
											Current artifacts for this application.
										</CardDescription>
									</CardHeader>
									<CardContent className="flex flex-col gap-3">
										<div className="flex items-center justify-between gap-3">
											<span className="text-sm text-muted-foreground">
												Concept assertions
											</span>
											<Badge variant="outline">{assertions.length}</Badge>
										</div>
										<Separator />
										<div className="flex items-center justify-between gap-3">
											<span className="text-sm text-muted-foreground">
												Linked resumes
											</span>
											<Badge variant="outline">{resumes.length}</Badge>
										</div>
										<Separator />
										<div className="flex items-center justify-between gap-3">
											<span className="text-sm text-muted-foreground">
												Cover letter
											</span>
											<Badge variant="outline">
												{application.coverLetterId ? 'Tracked' : 'Missing'}
											</Badge>
										</div>
									</CardContent>
								</Card>
							</div>
						</TabsContent>
					</Tabs>
				</div>
			</main>
		</AppShell>
	);
});

export const Route = createFileRoute('/_authenticated/applications/$applicationId')({
	validateSearch: applicationSearchSchema,
	component: ApplicationRouteComponent,
	errorComponent: RouteError,
	pendingComponent: RouteLoading,
	loader: async ({ context, params }) => {
		const { applicationId } = params;
		const {
			store: { applicationStore, client },
		} = context;

		const applicationResult = await client.query<GetApplicationData, GetApplicationVariables>({
			query: GET_APPLICATION,
			variables: { id: applicationId },
			fetchPolicy: 'network-only',
		});
		const application = applicationResult.data?.getApplication;

		if (!application) {
			throw new Error(`Application ${applicationId} not found`);
		}

		applicationStore.selectApplication(applicationId);

		return { application };
	},
});
