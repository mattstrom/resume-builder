import { CreateApplicationDialog } from '@/components/CreateResumeDialog.tsx';
import { useFileManager } from '@/components/FileManager/FileManager.provider.tsx';
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
import { Separator } from '@/components/ui/separator.tsx';
import { useStore } from '@/stores/store.provider.tsx';
import { Link } from '@tanstack/react-router';
import { ArrowRight, BriefcaseBusiness, FileText } from 'lucide-react';
import { observer } from 'mobx-react';
import { useMemo } from 'react';
import { HomePageStore } from './home-page.store.ts';

const summaryCardClass =
	'border-border/60 bg-card/70 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80';

export const HomePage = observer(function HomePage() {
	const { authStore, applicationStore } = useStore();
	const { selectApiApplication } = useFileManager();
	const homePageStore = useMemo(
		() => new HomePageStore(authStore, applicationStore),
		[authStore, applicationStore],
	);

	const handleSelectApplication = (applicationId: string) => {
		void selectApiApplication(applicationId);
	};

	return (
		<div className="min-h-full overflow-auto bg-background">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8 md:px-8 md:py-10">
				<section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/40 shadow-sm">
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.14),transparent_35%),radial-gradient(circle_at_bottom_left,hsl(var(--accent)/0.22),transparent_30%)]" />
					<div className="relative flex flex-col gap-6 p-6 md:p-8">
						<div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
							<div className="flex max-w-3xl flex-col gap-3">
								<h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
									Welcome back, {homePageStore.firstName}.
								</h1>
								<p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
									Pick up the application you touched most
									recently, start a new one, or refine the
									profile details that power every resume you
									ship.
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-3">
								<CreateApplicationDialog>
									<Button variant="secondary">
										<FileText data-icon="inline-start" />
										New application
									</Button>
								</CreateApplicationDialog>
								<Button variant="outline" asChild>
									<Link to="/profile">Open profile</Link>
								</Button>
							</div>
						</div>
					</div>
				</section>

				{!homePageStore.hasApplications ? (
					<section className="grid min-h-[420px] place-items-center rounded-3xl border border-dashed border-border/70 bg-muted/20 px-6 py-12">
						<div className="flex max-w-xl flex-col items-center gap-5 text-center">
							<div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
								<BriefcaseBusiness />
							</div>
							<div className="flex flex-col gap-2">
								<h2 className="text-2xl font-semibold tracking-tight">
									Start your first application
								</h2>
								<p className="text-sm leading-6 text-muted-foreground">
									This home page becomes your fastest route
									back into work once you have applications in
									motion. Begin with a role, then shape your
									profile and resume from there.
								</p>
							</div>
							<div className="flex flex-wrap items-center justify-center gap-3">
								<CreateApplicationDialog>
									<Button variant="secondary">
										<FileText data-icon="inline-start" />
										Create application
									</Button>
								</CreateApplicationDialog>
								<Button variant="outline" asChild>
									<Link to="/profile/preferences">
										Review job preferences
									</Link>
								</Button>
							</div>
						</div>
					</section>
				) : (
					<>
						<section className="grid gap-4 md:grid-cols-3">
							<Card className={summaryCardClass}>
								<CardHeader className="gap-1">
									<CardDescription>
										Total applications
									</CardDescription>
									<CardTitle className="text-3xl">
										{
											homePageStore.summary
												.totalApplications
										}
									</CardTitle>
								</CardHeader>
							</Card>
							<Card className={summaryCardClass}>
								<CardHeader className="gap-1">
									<CardDescription>
										Linked resumes
									</CardDescription>
									<CardTitle className="text-3xl">
										{
											homePageStore.summary
												.applicationsWithResume
										}
									</CardTitle>
								</CardHeader>
							</Card>
							<Card className={summaryCardClass}>
								<CardHeader className="gap-1">
									<CardDescription>
										Companies tracked
									</CardDescription>
									<CardTitle className="text-3xl">
										{
											homePageStore.summary
												.distinctCompanies
										}
									</CardTitle>
								</CardHeader>
							</Card>
						</section>

						<section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
							<Card className={summaryCardClass}>
								<CardHeader className="gap-3">
									<div className="flex items-center justify-between gap-3">
										<div>
											<CardDescription>
												Continue working
											</CardDescription>
											<CardTitle className="text-2xl">
												{
													homePageStore
														.continueApplication
														?.name
												}
											</CardTitle>
										</div>
										<Badge variant="outline">
											{homePageStore.normalizeCompany(
												homePageStore
													.continueApplication
													?.company,
											)}
										</Badge>
									</div>
									<p className="max-w-2xl text-sm leading-6 text-muted-foreground">
										Resume the most recent application
										without digging through the sidebar.
									</p>
								</CardHeader>
								<CardContent className="flex flex-col gap-5">
									<div className="grid gap-4 sm:grid-cols-2">
										<div className="rounded-2xl border border-border/60 bg-background/70 p-4">
											<p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
												Updated
											</p>
											<p className="mt-2 text-sm font-medium text-foreground">
												{homePageStore.continueApplication
													? homePageStore.formatApplicationUpdatedAt(
															homePageStore
																.continueApplication
																.updatedAt,
														)
													: null}
											</p>
										</div>
										<div className="rounded-2xl border border-border/60 bg-background/70 p-4">
											<p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
												Resume status
											</p>
											<p className="mt-2 text-sm font-medium text-foreground">
												{(homePageStore
													.continueApplication
													?.resumes?.length ?? 0) > 0
													? 'Resume linked'
													: 'Resume not linked yet'}
											</p>
										</div>
									</div>
								</CardContent>
								<CardFooter>
									<Button asChild>
										<Link
											to="/editor/$applicationId"
											params={{
												applicationId:
													homePageStore
														.continueApplication
														?._id ?? '',
											}}
											onClick={() => {
												if (
													homePageStore
														.continueApplication
														?._id
												) {
													handleSelectApplication(
														homePageStore
															.continueApplication
															._id,
													);
												}
											}}
										>
											Open in editor
											<ArrowRight data-icon="inline-end" />
										</Link>
									</Button>
								</CardFooter>
							</Card>

							<Card className={summaryCardClass}>
								<CardHeader>
									<CardDescription>
										Recent applications
									</CardDescription>
									<CardTitle>Latest activity</CardTitle>
								</CardHeader>
								<CardContent className="flex flex-col">
									{homePageStore.recentApplications.map(
										(application, index) => (
											<div key={application._id}>
												<div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3">
													<div className="flex min-w-0 flex-col gap-1">
														<Button
															variant="link"
															className="h-auto justify-start p-0 text-left text-base font-medium text-foreground no-underline hover:no-underline"
															asChild
														>
															<Link
																to="/editor/$applicationId"
																params={{
																	applicationId:
																		application._id,
																}}
																onClick={() =>
																	handleSelectApplication(
																		application._id,
																	)
																}
															>
																<span className="block truncate">
																	{
																		application.name
																	}
																</span>
															</Link>
														</Button>
														<p className="truncate text-sm text-muted-foreground">
															{homePageStore.normalizeCompany(
																application.company,
															)}
														</p>
													</div>
													<div className="flex min-w-[11rem] flex-col items-end text-right">
														<p className="text-sm text-foreground">
															{homePageStore.formatApplicationUpdatedAt(
																application.updatedAt,
															)}
														</p>
														<p className="text-xs text-muted-foreground">
															{(application
																.resumes
																?.length ?? 0) >
															0
																? 'Resume linked'
																: 'No linked resume'}
														</p>
													</div>
												</div>
												{index <
												homePageStore.recentApplications
													.length -
													1 ? (
													<Separator />
												) : null}
											</div>
										),
									)}
								</CardContent>
							</Card>
						</section>
					</>
				)}
			</div>
		</div>
	);
});
