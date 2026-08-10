import { useMutation, useQuery } from '@apollo/client/react';
import { Check, CircleAlert, PanelLeftClose, PanelLeftOpen, Sparkles, Target } from 'lucide-react';
import { observer } from 'mobx-react';
import { type FC, type FocusEvent, type MouseEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

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
import { Spinner } from '@/components/ui/spinner.tsx';
import {
	GET_CONCEPT_EVIDENCE_ASSESSMENT,
	GET_JOB_REQUIREMENTS,
	RESOLVE_CONCEPT_LABELS,
	SAVE_CONCEPT_EVIDENCE_ASSESSMENT,
} from '@/graphql/queries.ts';
import type {
	ConceptEvidenceAssessmentVariables,
	GetConceptEvidenceAssessmentData,
	GetJobRequirementsData,
	GetJobRequirementsVariables,
	ResolveConceptLabelsData,
	ResolveConceptLabelsVariables,
	SaveConceptEvidenceAssessmentData,
	SaveConceptEvidenceAssessmentVariables,
} from '@/graphql/types.ts';
import {
	buildConceptEvidenceEvaluationInput,
	conceptEvidenceEvaluationSchema,
	conceptLabelsForResume,
	deriveConceptCoverage,
	hashConceptEvidenceEvaluationInput,
	type ConceptEvidenceEvaluation,
	type RequirementConceptCoverage,
} from '@/lib/concept-coverage.ts';
import { getMastraClient } from '@/lib/mastra-client.ts';
import { cn } from '@/lib/utils.ts';
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

type EvidenceEvaluation = ConceptEvidenceEvaluation['evaluations'][number];

const CONCEPT_EVIDENCE_EVALUATOR_VERSION = 1;

const gradePresentation: Record<
	EvidenceEvaluation['grade'],
	{ label: string; variant: 'success' | 'info' | 'warning' | 'destructive' }
> = {
	strong: { label: 'Strong', variant: 'success' },
	moderate: { label: 'Moderate', variant: 'info' },
	weak: { label: 'Weak', variant: 'warning' },
	missing: { label: 'Missing', variant: 'destructive' },
};

const ConceptCard: FC<{
	coverage: RequirementConceptCoverage;
	evaluation?: EvidenceEvaluation;
	evidenceTextById: ReadonlyMap<string, string>;
	isFocused: boolean;
	onFocusEvidence: () => void;
	onClearEvidenceFocus: () => void;
}> = ({
	coverage,
	evaluation,
	evidenceTextById,
	isFocused,
	onFocusEvidence,
	onClearEvidenceFocus,
}) => {
	const hasEvidence = Boolean(evaluation?.evidenceItemIds.length);
	const handleMouseLeave = (event: MouseEvent<HTMLElement>) => {
		if (!event.currentTarget.contains(document.activeElement)) {
			onClearEvidenceFocus();
		}
	};
	const handleBlur = (event: FocusEvent<HTMLElement>) => {
		if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
			onClearEvidenceFocus();
		}
	};

	return (
		<Card
			tabIndex={hasEvidence ? 0 : undefined}
			onMouseEnter={hasEvidence ? onFocusEvidence : undefined}
			onMouseLeave={hasEvidence ? handleMouseLeave : undefined}
			onFocus={hasEvidence ? onFocusEvidence : undefined}
			onBlur={hasEvidence ? handleBlur : undefined}
			className={cn(
				hasEvidence && 'cursor-default focus-visible:outline-none',
				isFocused && 'ring-2 ring-info',
			)}
			aria-label={
				hasEvidence
					? `${coverage.concept.label}: focus to highlight supporting resume sections`
					: undefined
			}
		>
			<CardHeader className="gap-2 p-3">
				<div className="flex items-start justify-between gap-2">
					<CardTitle className="text-sm leading-snug">{coverage.concept.label}</CardTitle>
					<Badge
						variant={
							evaluation
								? gradePresentation[evaluation.grade].variant
								: coverage.covered
									? 'secondary'
									: 'outline'
						}
					>
						{evaluation
							? `${gradePresentation[evaluation.grade].label} · ${Math.round(evaluation.score * 100)}`
							: coverage.covered
								? 'Mapped'
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
				{evaluation && (
					<p className="text-xs leading-relaxed text-foreground">
						{evaluation.rationale}
					</p>
				)}
				{evaluation?.evidenceItemIds.map((itemId) => {
					const text = evidenceTextById.get(itemId);
					return text ? (
						<blockquote
							key={itemId}
							className="line-clamp-3 border-l-2 pl-2 text-xs leading-relaxed text-muted-foreground"
						>
							{text}
						</blockquote>
					) : null;
				})}
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
};

const LoadingState = () => (
	<div className="flex flex-col gap-3 p-4" aria-label="Loading requirement concepts">
		<Skeleton className="h-2 w-full" />
		<Skeleton className="h-24 w-full" />
		<Skeleton className="h-24 w-full" />
		<Skeleton className="h-24 w-full" />
	</div>
);

export const ConceptCoveragePanel: FC<ConceptCoveragePanelProps> = observer(
	({ applicationId, collapsed, onToggleCollapse }) => {
		const { bulletsStore, editorStore, inspectStore } = useStore();
		const [evaluation, setEvaluation] = useState<ConceptEvidenceEvaluation>();
		const [currentInputHash, setCurrentInputHash] = useState('');
		const [evaluatedInputHash, setEvaluatedInputHash] = useState('');
		const [evaluatedVersion, setEvaluatedVersion] = useState(0);
		const [isEvaluating, setIsEvaluating] = useState(false);
		const [focusedConceptId, setFocusedConceptId] = useState<string>();
		const resumeRecord = editorStore.resumeData;
		const resumeId = resumeRecord?._id ?? resumeRecord?.id ?? '';
		useEffect(() => {
			setEvaluation(undefined);
			setCurrentInputHash('');
			setEvaluatedInputHash('');
			setEvaluatedVersion(0);
			setFocusedConceptId(undefined);
			inspectStore.clearConceptEvidenceFocus();
		}, [applicationId, inspectStore, resumeId]);
		useEffect(() => () => inspectStore.clearConceptEvidenceFocus(), [inspectStore]);
		const { data, loading, error } = useQuery<
			GetJobRequirementsData,
			GetJobRequirementsVariables
		>(GET_JOB_REQUIREMENTS, {
			variables: { applicationId },
			fetchPolicy: 'cache-and-network',
		});
		const { data: persistedAssessmentData } = useQuery<
			GetConceptEvidenceAssessmentData,
			ConceptEvidenceAssessmentVariables
		>(GET_CONCEPT_EVIDENCE_ASSESSMENT, {
			variables: { applicationId, resumeId },
			skip: !resumeId,
			fetchPolicy: 'cache-and-network',
		});
		const [saveAssessment] = useMutation<
			SaveConceptEvidenceAssessmentData,
			SaveConceptEvidenceAssessmentVariables
		>(SAVE_CONCEPT_EVIDENCE_ASSESSMENT);
		const resume = resumeRecord?.data;
		const requirements = data?.jobRequirements ?? [];
		const conceptLabels = useMemo(
			() => (resume ? conceptLabelsForResume(resume) : []),
			[resume],
		);
		const { data: resolvedLabelData } = useQuery<
			ResolveConceptLabelsData,
			ResolveConceptLabelsVariables
		>(RESOLVE_CONCEPT_LABELS, {
			variables: { labels: conceptLabels },
			skip: conceptLabels.length === 0,
			fetchPolicy: 'cache-first',
		});
		const resolvedLabels = resolvedLabelData?.resolveConceptLabels;
		const summary = useMemo(
			() =>
				resume
					? deriveConceptCoverage(requirements, bulletsStore.bullets, resume)
					: { concepts: [], coveredCount: 0, totalCount: 0 },
			[requirements, bulletsStore.bullets, resume],
		);
		const evaluationInput = useMemo(
			() =>
				resume
					? buildConceptEvidenceEvaluationInput(
							summary,
							bulletsStore.bullets,
							resume,
							resolvedLabels,
						)
					: { concepts: [], evidenceItems: [] },
			[summary, bulletsStore.bullets, resume, resolvedLabels],
		);
		const evaluationFingerprint = JSON.stringify(evaluationInput);
		useEffect(() => {
			let cancelled = false;
			void hashConceptEvidenceEvaluationInput(evaluationInput).then((hash) => {
				if (!cancelled) setCurrentInputHash(hash);
			});
			return () => {
				cancelled = true;
			};
		}, [evaluationFingerprint]);
		const persistedAssessment = persistedAssessmentData?.conceptEvidenceAssessment;
		useEffect(() => {
			if (
				!persistedAssessment ||
				persistedAssessment.applicationId !== applicationId ||
				persistedAssessment.resumeId !== resumeId
			) {
				return;
			}

			const parsed = conceptEvidenceEvaluationSchema.safeParse(persistedAssessment.result);
			if (!parsed.success) return;

			setEvaluation(parsed.data);
			setEvaluatedInputHash(persistedAssessment.inputHash);
			setEvaluatedVersion(persistedAssessment.evaluatorVersion);
		}, [applicationId, persistedAssessment, resumeId]);
		const isEvaluationStale = Boolean(
			evaluation &&
			currentInputHash &&
			(evaluatedInputHash !== currentInputHash ||
				evaluatedVersion !== CONCEPT_EVIDENCE_EVALUATOR_VERSION),
		);
		const evaluationByConceptId = useMemo(
			() => new Map(evaluation?.evaluations.map((item) => [item.conceptId, item]) ?? []),
			[evaluation],
		);
		const evidenceTextById = useMemo(
			() => new Map(evaluationInput.evidenceItems.map(({ id, text }) => [id, text])),
			[evaluationInput],
		);
		const evidencePathsById = useMemo(
			() => new Map(evaluationInput.evidenceItems.map(({ id, paths }) => [id, paths])),
			[evaluationInput],
		);
		const focusConceptEvidence = (conceptId: string) => {
			const evidenceItemIds = evaluationByConceptId.get(conceptId)?.evidenceItemIds ?? [];
			const paths = [
				...new Set(
					evidenceItemIds.flatMap((itemId) => evidencePathsById.get(itemId) ?? []),
				),
			];
			if (paths.length === 0) return;

			setFocusedConceptId(conceptId);
			inspectStore.focusConceptEvidence(paths);
		};
		const clearConceptEvidenceFocus = () => {
			setFocusedConceptId(undefined);
			inspectStore.clearConceptEvidenceFocus();
		};
		const needsEvidence = summary.concepts.filter((coverage) => {
			const grade = evaluationByConceptId.get(coverage.concept.id)?.grade;
			return evaluation
				? !grade || grade === 'weak' || grade === 'missing'
				: !coverage.covered;
		});
		const evidenced = summary.concepts.filter((coverage) => {
			const grade = evaluationByConceptId.get(coverage.concept.id)?.grade;
			return evaluation ? grade === 'strong' || grade === 'moderate' : coverage.covered;
		});
		const progress = summary.totalCount
			? evaluation
				? Math.round(
						(summary.concepts.reduce(
							(total, { concept }) =>
								total + (evaluationByConceptId.get(concept.id)?.score ?? 0),
							0,
						) /
							summary.totalCount) *
							100,
					)
				: Math.round((summary.coveredCount / summary.totalCount) * 100)
			: 0;

		const evaluateEvidence = async () => {
			if (evaluationInput.concepts.length === 0) return;

			clearConceptEvidenceFocus();
			setIsEvaluating(true);
			try {
				const client = await getMastraClient();
				const workflow = client.getWorkflow('conceptEvidenceEvaluationWorkflow');
				const run = await workflow.createRun();
				const result = await run.startAsync({
					inputData: evaluationInput,
				});

				if (result.status !== 'success') {
					throw new Error('Concept evidence evaluation did not complete.');
				}

				const parsedEvaluation = conceptEvidenceEvaluationSchema.parse(result.result);
				const inputHash = await hashConceptEvidenceEvaluationInput(evaluationInput);
				await saveAssessment({
					variables: {
						applicationId,
						resumeId,
						inputHash,
						evaluatorVersion: CONCEPT_EVIDENCE_EVALUATOR_VERSION,
						result: parsedEvaluation,
					},
				});
				setEvaluation(parsedEvaluation);
				setCurrentInputHash(inputHash);
				setEvaluatedInputHash(inputHash);
				setEvaluatedVersion(CONCEPT_EVIDENCE_EVALUATOR_VERSION);
				toast.success('Concept evidence grades saved.');
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : 'Could not evaluate concept evidence.',
				);
			} finally {
				setIsEvaluating(false);
			}
		};

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
						<Target className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
						<div className="flex min-w-0 flex-1 flex-col gap-1">
							<h2 id="concept-coverage-title" className="text-sm font-semibold">
								Concept coverage
							</h2>
							<p className="text-xs leading-relaxed text-muted-foreground">
								How strongly the complete resume demonstrates this job's concepts.
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
						<Button
							type="button"
							size="sm"
							className="w-full"
							disabled={isEvaluating}
							onClick={() => void evaluateEvidence()}
						>
							{isEvaluating ? (
								<Spinner data-icon="inline-start" />
							) : (
								<Sparkles data-icon="inline-start" />
							)}
							{evaluation ? 'Re-evaluate evidence' : 'Evaluate evidence'}
						</Button>
					)}
					{summary.totalCount > 0 && (
						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between text-xs">
								<span>
									{progress}% {evaluation ? 'evidence strength' : 'mapped'}
								</span>
								<span className="text-muted-foreground">
									{evaluation ? evidenced.length : summary.coveredCount} of{' '}
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
							{evaluation && (
								<Alert>
									<Sparkles />
									<AlertTitle className="flex items-center gap-2">
										Agent assessment
										{isEvaluationStale && (
											<Badge variant="warning">Out of date</Badge>
										)}
									</AlertTitle>
									<AlertDescription>
										{evaluation.summary}
										<span className="mt-1 block">
											Focus a concept to highlight its supporting resume
											sections.
										</span>
									</AlertDescription>
								</Alert>
							)}
							{error && (
								<Alert variant="destructive">
									<CircleAlert />
									<AlertTitle>Concepts unavailable</AlertTitle>
									<AlertDescription>{error.message}</AlertDescription>
								</Alert>
							)}

							{!error && summary.totalCount === 0 && (
								<Alert>
									<Target />
									<AlertTitle>No concepts identified</AlertTitle>
									<AlertDescription>
										Identify job requirements to populate this checklist.
									</AlertDescription>
								</Alert>
							)}

							{needsEvidence.length > 0 ? (
								<section
									className="flex flex-col gap-2"
									aria-labelledby="needs-coverage-title"
								>
									<div className="flex items-center justify-between">
										<h3
											id="needs-coverage-title"
											className="text-xs font-semibold uppercase tracking-wide"
										>
											{evaluation
												? 'Needs stronger evidence'
												: 'Needs mapping'}
										</h3>
										<Badge variant="outline">{needsEvidence.length}</Badge>
									</div>
									{needsEvidence.map((coverage) => (
										<ConceptCard
											key={coverage.concept.id}
											coverage={coverage}
											evaluation={evaluationByConceptId.get(
												coverage.concept.id,
											)}
											evidenceTextById={evidenceTextById}
											isFocused={focusedConceptId === coverage.concept.id}
											onFocusEvidence={() =>
												focusConceptEvidence(coverage.concept.id)
											}
											onClearEvidenceFocus={clearConceptEvidenceFocus}
										/>
									))}
								</section>
							) : (
								summary.totalCount > 0 && (
									<Alert>
										<Check />
										<AlertTitle>
											{evaluation
												? 'All concepts evidenced'
												: 'All concepts mapped'}
										</AlertTitle>
										<AlertDescription>
											{evaluation
												? 'Every concept has moderate or strong evidence in the resume.'
												: 'Every identified concept appears in a selected bullet.'}
										</AlertDescription>
									</Alert>
								)
							)}

							{evidenced.length > 0 && (
								<section
									className="flex flex-col gap-2"
									aria-labelledby="covered-title"
								>
									<div className="flex items-center justify-between">
										<h3
											id="covered-title"
											className="text-xs font-semibold uppercase tracking-wide"
										>
											{evaluation ? 'Well evidenced' : 'Mapped'}
										</h3>
										<Badge variant="secondary">{evidenced.length}</Badge>
									</div>
									{evidenced.map((coverage) => (
										<ConceptCard
											key={coverage.concept.id}
											coverage={coverage}
											evaluation={evaluationByConceptId.get(
												coverage.concept.id,
											)}
											evidenceTextById={evidenceTextById}
											isFocused={focusedConceptId === coverage.concept.id}
											onFocusEvidence={() =>
												focusConceptEvidence(coverage.concept.id)
											}
											onClearEvidenceFocus={clearConceptEvidenceFocus}
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
