import { useQuery } from '@apollo/client/react';
import {
	Check,
	CircleAlert,
	PanelLeftClose,
	PanelLeftOpen,
	Target,
} from 'lucide-react';
import { observer } from 'mobx-react';
import { type FC, useMemo } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card.tsx';
import { Progress } from '@/components/ui/progress.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { GET_JOB_REQUIREMENTS } from '@/graphql/queries.ts';
import type {
	GetJobRequirementsData,
	GetJobRequirementsVariables,
} from '@/graphql/types.ts';
import {
	deriveConceptCoverage,
	type RequirementConceptCoverage,
} from '@/lib/concept-coverage.ts';
import { useStore } from '@/stores/store.provider.tsx';

interface ConceptCoveragePanelProps {
	applicationId: string;
	collapsed: boolean;
	onToggleCollapse: () => void;
}

const relationLabels: Record<RequirementConceptCoverage['relation'], string> = {
	requires: 'Required',
	expects: 'Expected',
	prefers: 'Preferred',
};

const ConceptCard: FC<{ coverage: RequirementConceptCoverage }> = ({
	coverage,
}) => (
	<Card>
		<CardHeader className="gap-2 p-3">
			<div className="flex items-start justify-between gap-2">
				<CardTitle className="text-sm leading-snug">
					{coverage.concept.label}
				</CardTitle>
				<Badge variant={coverage.covered ? 'secondary' : 'outline'}>
					{coverage.covered
						? 'Covered'
						: relationLabels[coverage.relation]}
				</Badge>
			</div>
			{coverage.concept.definition && (
				<CardDescription className="line-clamp-2 text-xs">
					{coverage.concept.definition}
				</CardDescription>
			)}
		</CardHeader>
		<CardContent className="flex flex-col gap-1 p-3 pt-0">
			{coverage.requirements.map((requirement) => (
				<p
					key={requirement.id}
					className="text-xs leading-relaxed text-muted-foreground"
				>
					{requirement.what}
				</p>
			))}
		</CardContent>
	</Card>
);

const LoadingState = () => (
	<div
		className="flex flex-col gap-3 p-4"
		aria-label="Loading requirement concepts"
	>
		<Skeleton className="h-2 w-full" />
		<Skeleton className="h-24 w-full" />
		<Skeleton className="h-24 w-full" />
		<Skeleton className="h-24 w-full" />
	</div>
);

export const ConceptCoveragePanel: FC<ConceptCoveragePanelProps> = observer(
	({ applicationId, collapsed, onToggleCollapse }) => {
		const { bulletsStore, editorStore } = useStore();
		const { data, loading, error } = useQuery<
			GetJobRequirementsData,
			GetJobRequirementsVariables
		>(GET_JOB_REQUIREMENTS, {
			variables: { applicationId },
			fetchPolicy: 'cache-and-network',
		});
		const resume = editorStore.resumeData?.data;
		const requirements = data?.jobRequirements ?? [];
		const summary = useMemo(
			() =>
				resume
					? deriveConceptCoverage(
							requirements,
							bulletsStore.bullets,
							resume,
						)
					: { concepts: [], coveredCount: 0, totalCount: 0 },
			[requirements, bulletsStore.bullets, resume],
		);
		const uncovered = summary.concepts.filter(({ covered }) => !covered);
		const covered = summary.concepts.filter(({ covered }) => covered);
		const progress = summary.totalCount
			? Math.round((summary.coveredCount / summary.totalCount) * 100)
			: 0;

		if (collapsed) {
			return (
				<aside className="flex h-full w-full justify-center border-r bg-background pt-2 text-foreground print:hidden">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={onToggleCollapse}
						aria-label="Expand concept coverage"
						title="Expand concept coverage"
					>
						<PanelLeftOpen data-icon="inline-start" />
					</Button>
				</aside>
			);
		}

		return (
			<aside
				className="flex h-full w-full flex-col border-r bg-background text-foreground print:hidden"
				aria-labelledby="concept-coverage-title"
			>
				<header className="flex flex-col gap-3 border-b p-4">
					<div className="flex items-start gap-2">
						<Target
							className="mt-0.5 size-4 shrink-0"
							aria-hidden="true"
						/>
						<div className="flex min-w-0 flex-1 flex-col gap-1">
							<h2
								id="concept-coverage-title"
								className="text-sm font-semibold"
							>
								Concept coverage
							</h2>
							<p className="text-xs leading-relaxed text-muted-foreground">
								Concepts from this job that your selected
								bullets need to demonstrate.
							</p>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={onToggleCollapse}
							aria-label="Collapse concept coverage"
							title="Collapse concept coverage"
						>
							<PanelLeftClose data-icon="inline-start" />
						</Button>
					</div>
					{summary.totalCount > 0 && (
						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between text-xs">
								<span>{progress}% covered</span>
								<span className="text-muted-foreground">
									{summary.coveredCount} of{' '}
									{summary.totalCount}
								</span>
							</div>
							<Progress
								value={progress}
								className="h-2"
								aria-label={`${progress}% covered`}
							/>
						</div>
					)}
				</header>

				{loading && !data ? (
					<LoadingState />
				) : (
					<ScrollArea className="min-h-0 flex-1">
						<div className="flex flex-col gap-4 p-4">
							{error && (
								<Alert variant="destructive">
									<CircleAlert />
									<AlertTitle>
										Concepts unavailable
									</AlertTitle>
									<AlertDescription>
										{error.message}
									</AlertDescription>
								</Alert>
							)}

							{!error && summary.totalCount === 0 && (
								<Alert>
									<Target />
									<AlertTitle>
										No concepts identified
									</AlertTitle>
									<AlertDescription>
										Identify job requirements to populate
										this checklist.
									</AlertDescription>
								</Alert>
							)}

							{uncovered.length > 0 ? (
								<section
									className="flex flex-col gap-2"
									aria-labelledby="needs-coverage-title"
								>
									<div className="flex items-center justify-between">
										<h3
											id="needs-coverage-title"
											className="text-xs font-semibold uppercase tracking-wide"
										>
											Needs coverage
										</h3>
										<Badge variant="outline">
											{uncovered.length}
										</Badge>
									</div>
									{uncovered.map((coverage) => (
										<ConceptCard
											key={coverage.concept.id}
											coverage={coverage}
										/>
									))}
								</section>
							) : (
								summary.totalCount > 0 && (
									<Alert>
										<Check />
										<AlertTitle>
											All concepts covered
										</AlertTitle>
										<AlertDescription>
											Every identified concept appears in
											a selected bullet.
										</AlertDescription>
									</Alert>
								)
							)}

							{covered.length > 0 && (
								<section
									className="flex flex-col gap-2"
									aria-labelledby="covered-title"
								>
									<div className="flex items-center justify-between">
										<h3
											id="covered-title"
											className="text-xs font-semibold uppercase tracking-wide"
										>
											Covered
										</h3>
										<Badge variant="secondary">
											{covered.length}
										</Badge>
									</div>
									{covered.map((coverage) => (
										<ConceptCard
											key={coverage.concept.id}
											coverage={coverage}
										/>
									))}
								</section>
							)}
						</div>
					</ScrollArea>
				)}
			</aside>
		);
	},
);
