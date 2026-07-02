import { useMutation } from '@apollo/client/react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { FileText, Save } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AppShell } from '@/components/app-shell/AppShell.tsx';
import { RouteError } from '@/components/RouteError.tsx';
import { RouteLoading } from '@/components/RouteLoading.tsx';
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
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { UPDATE_APPLICATION } from '@/graphql/mutations.ts';
import { GET_APPLICATION } from '@/graphql/queries.ts';
import type {
	GetApplicationData,
	GetApplicationVariables,
	UpdateApplicationData,
	UpdateApplicationVariables,
} from '@/graphql/types.ts';
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

type ScoreRowProps = {
	label: string;
	value?: number | null;
};

const getInitialFormState = (
	application: GetApplicationData['getApplication'],
): ApplicationFormState => ({
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

function formatList(values?: string[] | null) {
	return values?.filter(Boolean).join(', ') || 'Not captured';
}

function ScoreRow({ label, value }: ScoreRowProps) {
	return (
		<div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
			<span className="text-sm text-muted-foreground">{label}</span>
			<Badge variant="outline">
				{typeof value === 'number' ? `${Math.round(value * 100)}%` : 'No score'}
			</Badge>
		</div>
	);
}

function ApplicationRouteComponent() {
	const { applicationId } = Route.useParams();
	const { applicationStore } = useStore();
	const { application } = Route.useLoaderData();
	const [formState, setFormState] = useState(() => getInitialFormState(application));
	const [updateApplication, { loading }] = useMutation<
		UpdateApplicationData,
		UpdateApplicationVariables
	>(UPDATE_APPLICATION);
	const resumes = application.resumes ?? [];
	const jobSummary = application.jobSummary;
	const analysis = application.analysis;

	useEffect(() => {
		setFormState(getInitialFormState(application));
		document.title = application.name ? `${application.name} - Application` : 'Application';

		return () => {
			document.title = 'Resume Builder';
		};
	}, [application]);

	const updateField =
		(field: keyof ApplicationFormState) =>
		(value: string): void => {
			setFormState((current) => ({ ...current, [field]: value }));
		};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		await updateApplication({
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

		await applicationStore.refetch();
		toast.success('Application updated');
	};

	return (
		<AppShell>
			<main className="min-h-full overflow-auto bg-background">
				<div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8 md:px-8">
					<div className="flex flex-col gap-3">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="flex min-w-0 flex-col gap-1">
								<p className="text-sm text-muted-foreground">Application</p>
								<h1 className="truncate text-3xl font-semibold tracking-tight">
									{application.name || 'Untitled application'}
								</h1>
							</div>
							{resumes.length > 0 && (
								<Button variant="outline" asChild>
									<Link
										to="/editor/$applicationId"
										params={{ applicationId }}
										search={(previous) => ({
											...previous,
											resumeId: resumes[0]?._id,
										})}
									>
										Open editor
									</Link>
								</Button>
							)}
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="secondary">{application.company || 'No company'}</Badge>
							<Badge variant="outline">
								{resumes.length} {resumes.length === 1 ? 'resume' : 'resumes'}
							</Badge>
							{analysis?.overallFit !== undefined && (
								<Badge variant="outline">
									{Math.round(analysis.overallFit * 100)}% overall fit
								</Badge>
							)}
						</div>
					</div>

					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
						<Tabs defaultValue="details" className="flex flex-col gap-4">
							<TabsList className="w-fit">
								<TabsTrigger value="details">Details</TabsTrigger>
								<TabsTrigger value="posting">Posting</TabsTrigger>
								<TabsTrigger value="resumes">Resumes</TabsTrigger>
								<TabsTrigger value="analysis">Analysis</TabsTrigger>
								<TabsTrigger value="notes">Notes</TabsTrigger>
							</TabsList>

							<TabsContent value="details" className="mt-0">
								<Card>
									<CardHeader>
										<CardTitle>Details</CardTitle>
										<CardDescription>
											Core tracking fields for this application.
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

											<div className="flex flex-col gap-2">
												<Label htmlFor="application-cover-letter-id">
													Cover Letter ID
												</Label>
												<Input
													id="application-cover-letter-id"
													value={formState.coverLetterId}
													onChange={(event) =>
														updateField('coverLetterId')(
															event.target.value,
														)
													}
													placeholder="Cover letter document ID"
												/>
											</div>
										</div>
									</CardContent>
								</Card>
							</TabsContent>

							<TabsContent value="posting" className="mt-0">
								<Card>
									<CardHeader>
										<CardTitle>Posting</CardTitle>
										<CardDescription>
											Source material used for tailoring and assessment.
										</CardDescription>
									</CardHeader>
									<CardContent className="flex flex-col gap-5">
										<div className="flex flex-col gap-2">
											<Label htmlFor="application-job-posting-url">
												Job Posting URL
											</Label>
											<Input
												id="application-job-posting-url"
												type="url"
												value={formState.jobPostingUrl}
												onChange={(event) =>
													updateField('jobPostingUrl')(event.target.value)
												}
												placeholder="https://example.com/job/123"
											/>
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
												className="min-h-80"
											/>
										</div>
									</CardContent>
								</Card>
							</TabsContent>

							<TabsContent value="resumes" className="mt-0">
								<Card>
									<CardHeader>
										<CardTitle>Resumes</CardTitle>
										<CardDescription>
											Linked resumes for this application.
										</CardDescription>
									</CardHeader>
									<CardContent className="flex flex-col gap-3">
										{resumes.length > 0 ? (
											resumes.map((resume) => (
												<div
													key={resume._id}
													className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
												>
													<div className="flex min-w-0 items-center gap-3">
														<FileText />
														<span className="truncate text-sm font-medium">
															{resume.name || 'Untitled resume'}
														</span>
													</div>
													<Button variant="outline" size="sm" asChild>
														<Link
															to="/editor/$applicationId"
															params={{ applicationId }}
															search={(previous) => ({
																...previous,
																resumeId: resume._id,
															})}
														>
															Open
														</Link>
													</Button>
												</div>
											))
										) : (
											<p className="text-sm text-muted-foreground">
												No resumes are linked to this application yet.
											</p>
										)}
									</CardContent>
									{resumes.length > 0 && (
										<CardFooter>
											<Button asChild>
												<Link
													to="/editor/$applicationId"
													params={{ applicationId }}
													search={(previous) => ({
														...previous,
														resumeId: resumes[0]?._id,
													})}
												>
													Open latest resume
												</Link>
											</Button>
										</CardFooter>
									)}
								</Card>
							</TabsContent>

							<TabsContent value="analysis" className="mt-0">
								<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
									<Card>
										<CardHeader>
											<CardTitle>Job Summary</CardTitle>
											<CardDescription>
												Structured requirements captured from the posting.
											</CardDescription>
										</CardHeader>
										<CardContent className="grid gap-3 md:grid-cols-2">
											<div className="flex flex-col gap-1 rounded-md border border-border px-3 py-2">
												<span className="text-sm text-muted-foreground">
													Required skills
												</span>
												<span className="text-sm">
													{formatList(jobSummary?.requiredSkills)}
												</span>
											</div>
											<div className="flex flex-col gap-1 rounded-md border border-border px-3 py-2">
												<span className="text-sm text-muted-foreground">
													Preferred skills
												</span>
												<span className="text-sm">
													{formatList(jobSummary?.preferredSkills)}
												</span>
											</div>
											<div className="flex flex-col gap-1 rounded-md border border-border px-3 py-2">
												<span className="text-sm text-muted-foreground">
													Education
												</span>
												<span className="text-sm">
													{jobSummary?.requiredEducation ||
														'Not captured'}
												</span>
											</div>
											<div className="flex flex-col gap-1 rounded-md border border-border px-3 py-2">
												<span className="text-sm text-muted-foreground">
													Experience
												</span>
												<span className="text-sm">
													{jobSummary?.requiredExperience ||
														'Not captured'}
												</span>
											</div>
											<div className="flex flex-col gap-1 rounded-md border border-border px-3 py-2">
												<span className="text-sm text-muted-foreground">
													Role level
												</span>
												<span className="text-sm">
													{jobSummary?.roleLevel || 'Not captured'}
												</span>
											</div>
											<div className="flex flex-col gap-1 rounded-md border border-border px-3 py-2">
												<span className="text-sm text-muted-foreground">
													Tech stack
												</span>
												<span className="text-sm">
													{formatList(jobSummary?.techStack)}
												</span>
											</div>
										</CardContent>
									</Card>

									<Card>
										<CardHeader>
											<CardTitle>Fit</CardTitle>
											<CardDescription>
												Current assessment scores for this application.
											</CardDescription>
										</CardHeader>
										<CardContent className="flex flex-col gap-2">
											<ScoreRow
												label="Overall"
												value={analysis?.overallFit}
											/>
											<ScoreRow
												label="Skills"
												value={analysis?.skillRelevance}
											/>
											<ScoreRow
												label="Experience"
												value={analysis?.experienceRelevance}
											/>
											<ScoreRow
												label="Role level"
												value={analysis?.roleLevelFit}
											/>
											<ScoreRow
												label="Location"
												value={analysis?.locationFit}
											/>
											<ScoreRow
												label="Compensation"
												value={analysis?.compensationFit}
											/>
											<ScoreRow
												label="Company"
												value={analysis?.companyFit}
											/>
											<ScoreRow
												label="Logistics"
												value={analysis?.logisticalFit}
											/>
										</CardContent>
									</Card>
								</div>
							</TabsContent>

							<TabsContent value="notes" className="mt-0">
								<Card>
									<CardHeader>
										<CardTitle>Notes</CardTitle>
										<CardDescription>
											Freeform tracking details for this opportunity.
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="flex flex-col gap-2">
											<Label htmlFor="application-notes">Notes</Label>
											<Textarea
												id="application-notes"
												value={formState.notes}
												onChange={(event) =>
													updateField('notes')(event.target.value)
												}
												placeholder="Interview notes, recruiter details, or next steps"
												className="min-h-80"
											/>
										</div>
									</CardContent>
								</Card>
							</TabsContent>
						</Tabs>

						<div className="flex justify-end">
							<Button type="submit" disabled={loading}>
								<Save data-icon="inline-start" />
								{loading ? 'Saving...' : 'Save changes'}
							</Button>
						</div>
					</form>
				</div>
			</main>
		</AppShell>
	);
}

export const Route = createFileRoute('/_authenticated/applications/$applicationId')({
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
		});
		const application = applicationResult.data?.getApplication;

		if (!application) {
			throw new Error(`Application ${applicationId} not found`);
		}

		applicationStore.selectApplication(applicationId);

		return { application };
	},
});
