import { professionalStatementEvaluationSchema } from '@resume-builder/entities';
import {
	BadgeCheck,
	BriefcaseBusiness,
	Check,
	CircleHelp,
	FileText,
	Info,
	Lightbulb,
	MessageCircle,
	Plus,
	Sparkles,
	Target,
	Trash2,
} from 'lucide-react';
import { observer } from 'mobx-react';
import { nanoid } from 'nanoid';
import {
	type FC,
	useCallback,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from 'react';
import { toast } from 'sonner';
import * as Y from 'yjs';

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
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip.tsx';
import { cn } from '@/lib/utils.ts';
import {
	parseProfessionalStatementEvaluation,
	professionalStatementCheckpointDefinitions,
} from '@/lib/professional-statements.ts';
import { getMastraClient } from '@/lib/mastra-client.ts';
import { useStore } from '@/stores/store.provider.tsx';

const LABEL_FIELD = 'label';
const TEXT_FIELD = 'text';
const ID_FIELD = 'id';
const EVALUATION_FIELD = 'evaluation';
const EVALUATED_TEXT_FIELD = 'evaluatedText';

function valueOf(statement: Y.Map<unknown>, field: string): string {
	const value = statement.get(field);
	return typeof value === 'string' ? value : '';
}

function createStatement(): Y.Map<unknown> {
	const statement = new Y.Map<unknown>();
	statement.set(ID_FIELD, nanoid());
	statement.set(LABEL_FIELD, 'Untitled statement');
	statement.set(TEXT_FIELD, '');
	return statement;
}

function useYArrayDeep(array: Y.Array<Y.Map<unknown>> | null): void {
	const [, render] = useReducer((value: number) => value + 1, 0);

	useEffect(() => {
		if (!array) {
			return;
		}
		array.observeDeep(render);
		return () => array.unobserveDeep(render);
	}, [array]);
}

interface StatementListItemProps {
	statement: Y.Map<unknown>;
	selected: boolean;
	onDelete: () => void;
	onSelect: () => void;
}

const StatementListItem: FC<StatementListItemProps> = ({
	statement,
	selected,
	onDelete,
	onSelect,
}) => (
	<div
		className={cn(
			'group flex items-center rounded-md border bg-card shadow-sm transition-colors',
			selected && 'border-ring ring-1 ring-ring',
		)}
	>
		<button
			type="button"
			className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left text-sm"
			onClick={onSelect}
		>
			<FileText className="size-4 shrink-0 text-muted-foreground" />
			<span className={cn('truncate', selected && 'font-medium')}>
				{valueOf(statement, LABEL_FIELD) || 'Untitled statement'}
			</span>
		</button>
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="mr-1 size-7 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
					onClick={onDelete}
					aria-label={`Delete ${valueOf(statement, LABEL_FIELD) || 'statement'}`}
				>
					<Trash2 />
				</Button>
			</TooltipTrigger>
			<TooltipContent>Delete statement</TooltipContent>
		</Tooltip>
	</div>
);

export const ProfessionalStatementsView: FC = observer(() => {
	const { profileStore, uiStateStore } = useStore();
	const [selectedId, setSelectedId] = useState<string>();
	const [isEvaluating, setIsEvaluating] = useState(false);
	const checkpointsGuideRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		void profileStore.connect();
		return () => profileStore.disconnect();
	}, [profileStore]);

	const statementsArray = profileStore.professionalStatementsArray;
	useYArrayDeep(statementsArray);
	const statements = statementsArray?.toArray() ?? [];
	const statementCount = statements.length;

	const addStatement = useCallback(() => {
		if (!statementsArray) {
			return;
		}
		const statement = createStatement();
		statementsArray.push([statement]);
		setSelectedId(valueOf(statement, ID_FIELD));
	}, [statementsArray]);

	useEffect(() => {
		if (!profileStore.isSynced || !statementsArray) {
			return;
		}
		if (statementsArray.length === 0) {
			setSelectedId(undefined);
			return;
		}

		const hasSelection = statementsArray
			.toArray()
			.some((statement) => valueOf(statement, ID_FIELD) === selectedId);
		if (!hasSelection) {
			setSelectedId(valueOf(statementsArray.get(0), ID_FIELD));
		}
	}, [profileStore.isSynced, selectedId, statementCount, statementsArray]);

	const selectedStatement = statements.find(
		(statement) => valueOf(statement, ID_FIELD) === selectedId,
	);
	const statementText = selectedStatement
		? valueOf(selectedStatement, TEXT_FIELD)
		: '';
	const serializedEvaluation = selectedStatement
		? valueOf(selectedStatement, EVALUATION_FIELD)
		: '';
	const evaluation = useMemo(
		() => parseProfessionalStatementEvaluation(serializedEvaluation),
		[serializedEvaluation],
	);
	const evaluatedText = selectedStatement
		? valueOf(selectedStatement, EVALUATED_TEXT_FIELD)
		: '';
	const isEvaluationStale = Boolean(
		evaluation && evaluatedText !== statementText,
	);
	const metCount = evaluation
		? Object.values(evaluation.checkpoints).filter(
				({ status }) => status === 'met',
			).length
		: 0;

	const evaluateStatement = async () => {
		const statement = selectedStatement;
		const sourceText = statementText;
		const text = sourceText.trim();
		if (!statement || !text) {
			toast.error('Add a professional statement before evaluating it.');
			return;
		}

		setIsEvaluating(true);
		try {
			const client = await getMastraClient();
			const workflow = client.getWorkflow(
				'professionalStatementEvaluationWorkflow',
			);
			const run = await workflow.createRun();
			const result = await run.startAsync({
				inputData: { statement: text },
			});

			if (result.status !== 'success') {
				throw new Error('Statement evaluation did not complete.');
			}

			const nextEvaluation = professionalStatementEvaluationSchema.parse(
				result.result,
			);
			const saveEvaluation = () => {
				statement.set(EVALUATION_FIELD, JSON.stringify(nextEvaluation));
				statement.set(EVALUATED_TEXT_FIELD, sourceText);
			};
			if (statement.doc) {
				statement.doc.transact(saveEvaluation);
			} else {
				saveEvaluation();
			}
			toast.success('Statement checkpoints updated.');
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: 'Could not evaluate this statement.',
			);
		} finally {
			setIsEvaluating(false);
		}
	};

	const deleteStatement = (index: number) => {
		if (!statementsArray) {
			return;
		}
		statementsArray.delete(index, 1);
		const next = statementsArray.get(
			Math.min(index, statementsArray.length - 1),
		);
		setSelectedId(next ? valueOf(next, ID_FIELD) : undefined);
	};

	const connectionLabel = profileStore.isSynced
		? 'Saved automatically'
		: profileStore.status === 'connecting'
			? 'Connecting…'
			: 'Offline';

	return (
		<TooltipProvider>
			<div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-muted/30">
				<header className="shrink-0 bg-[var(--appbar-accent)] px-6 py-5 text-primary-foreground">
					<div className="mx-auto flex w-full max-w-[1600px] items-center gap-4">
						<div className="grid size-12 place-items-center rounded-lg bg-primary-foreground/15">
							<FileText className="size-6" />
						</div>
						<div>
							<h1 className="text-2xl font-semibold tracking-tight">
								Professional Statements
							</h1>
							<p className="text-sm text-primary-foreground/80">
								Create reusable summaries for different roles
								and applications.
							</p>
						</div>
					</div>
				</header>

				<div className="min-h-0 flex-1 p-4">
					<div className="mx-auto flex h-full w-full max-w-[1600px] overflow-hidden rounded-lg border bg-background shadow-sm">
						<aside className="flex w-72 shrink-0 flex-col border-r bg-muted/20">
							<div className="flex items-center gap-2 px-4 py-4 font-semibold">
								<BriefcaseBusiness className="size-4 text-muted-foreground" />
								Statements
							</div>
							<Separator />
							<div className="flex flex-col gap-3 p-3">
								<Alert className="bg-muted/40">
									<Info />
									<AlertTitle>Quick guide</AlertTitle>
									<AlertDescription className="flex flex-col gap-1 text-xs">
										<span>
											Labels are only for your reference.
										</span>
										<span>{connectionLabel}</span>
									</AlertDescription>
								</Alert>
								<Button
									variant="outline"
									className="w-full"
									onClick={addStatement}
								>
									<Plus data-icon="inline-start" />
									New statement
								</Button>
							</div>
							<ScrollArea className="min-h-0 flex-1 px-3 pb-3">
								<div className="flex flex-col gap-2">
									{statements.map((statement, index) => (
										<StatementListItem
											key={valueOf(statement, ID_FIELD)}
											statement={statement}
											selected={
												statement === selectedStatement
											}
											onSelect={() =>
												setSelectedId(
													valueOf(
														statement,
														ID_FIELD,
													),
												)
											}
											onDelete={() =>
												deleteStatement(index)
											}
										/>
									))}
								</div>
							</ScrollArea>
						</aside>

						{selectedStatement ? (
							<main className="min-w-0 flex-1 overflow-y-auto p-5">
								<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
									<div className="flex min-w-0 items-center gap-3">
										<div className="grid size-9 shrink-0 place-items-center rounded-md bg-muted">
											<FileText className="size-4 text-muted-foreground" />
										</div>
										<div className="min-w-0">
											<h2 className="truncate font-semibold">
												{valueOf(
													selectedStatement,
													LABEL_FIELD,
												) || 'Untitled statement'}
											</h2>
											<p className="text-xs text-muted-foreground">
												Edit your reusable professional
												summary.
											</p>
										</div>
									</div>
									<Badge
										variant="outline"
										className="gap-1.5 font-normal text-success"
									>
										<Check className="size-3" />
										{connectionLabel}
									</Badge>
								</div>

								<div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
									<div className="flex min-w-0 flex-col gap-4">
										<Card>
											<CardHeader>
												<CardTitle className="flex items-center gap-2 text-base">
													<Target className="size-4 text-muted-foreground" />
													Statement details
												</CardTitle>
												<CardDescription>
													Keep the summary broad
													enough to reuse, then tailor
													copies for specific roles.
												</CardDescription>
											</CardHeader>
											<CardContent>
												<FieldGroup>
													<Field>
														<FieldLabel htmlFor="statement-label">
															Label
														</FieldLabel>
														<Input
															id="statement-label"
															value={valueOf(
																selectedStatement,
																LABEL_FIELD,
															)}
															onChange={(event) =>
																selectedStatement.set(
																	LABEL_FIELD,
																	event.target
																		.value,
																)
															}
														/>
														<FieldDescription>
															A private nickname;
															it will not appear
															on your resume.
														</FieldDescription>
													</Field>
													<Field>
														<div className="flex items-center justify-between gap-3">
															<FieldLabel htmlFor="statement-text">
																Professional
																statement
															</FieldLabel>
															<span className="text-xs text-muted-foreground">
																{
																	statementText.length
																}{' '}
																characters
															</span>
														</div>
														<Textarea
															id="statement-text"
															value={
																statementText
															}
															onChange={(event) =>
																selectedStatement.set(
																	TEXT_FIELD,
																	event.target
																		.value,
																)
															}
															placeholder="Summarize who you are, what you do, and the impact you create…"
															className="min-h-48 resize-y leading-6"
														/>
														<FieldDescription>
															This can appear at
															the top of a resume
															as a professional
															summary.
														</FieldDescription>
													</Field>
												</FieldGroup>
											</CardContent>
										</Card>

										<Card>
											<CardHeader className="flex-row items-center justify-between gap-3">
												<div className="flex flex-col gap-1">
													<CardTitle className="flex items-center gap-2 text-base">
														<BadgeCheck className="size-4 text-muted-foreground" />
														Statement checkpoints
													</CardTitle>
													<CardDescription>
														Evidence-based feedback
														from your profile and
														current draft.
													</CardDescription>
												</div>
												<div className="flex items-center gap-2">
													<Badge variant="outline">
														{evaluation
															? `${metCount}/6 met`
															: 'Not evaluated'}
													</Badge>
													<Button
														size="sm"
														onClick={
															evaluateStatement
														}
														disabled={
															isEvaluating ||
															!statementText.trim()
														}
													>
														{isEvaluating ? (
															<Spinner data-icon="inline-start" />
														) : (
															<Sparkles data-icon="inline-start" />
														)}
														{evaluation
															? 'Re-evaluate'
															: 'Evaluate'}
													</Button>
												</div>
											</CardHeader>
											<CardContent className="flex flex-col gap-3">
												{isEvaluationStale && (
													<Alert>
														<Info />
														<AlertTitle>
															Evaluation is out of
															date
														</AlertTitle>
														<AlertDescription>
															The statement
															changed after these
															checkpoints were
															graded.
														</AlertDescription>
													</Alert>
												)}
												{evaluation && (
													<p className="text-sm text-muted-foreground">
														{evaluation.summary}
													</p>
												)}
												<div className="flex flex-wrap gap-2">
													{professionalStatementCheckpointDefinitions.map(
														(checkpoint) => {
															const result =
																evaluation
																	?.checkpoints[
																	checkpoint
																		.key
																];
															const isMet =
																result?.status ===
																'met';
															return (
																<Tooltip
																	key={
																		checkpoint.key
																	}
																>
																	<TooltipTrigger
																		asChild
																	>
																		<span>
																			<Badge
																				variant={
																					isMet
																						? 'secondary'
																						: 'outline'
																				}
																				className={cn(
																					'gap-1.5 px-3 py-1.5 font-normal',
																					isMet &&
																						'text-success',
																				)}
																			>
																				{isMet ? (
																					<Check className="size-3" />
																				) : (
																					<CircleHelp className="size-3" />
																				)}
																				{
																					checkpoint.label
																				}
																			</Badge>
																		</span>
																	</TooltipTrigger>
																	<TooltipContent className="flex max-w-sm flex-col gap-1">
																		{result && (
																			<p className="font-medium capitalize">
																				{result.status.replace(
																					'-',
																					' ',
																				)}{' '}
																				·
																				score{' '}
																				{Math.round(
																					result.score *
																						100,
																				)}

																				%
																				·
																				confidence{' '}
																				{Math.round(
																					result.confidence *
																						100,
																				)}

																				%
																			</p>
																		)}
																		<p>
																			{result?.feedback ??
																				checkpoint.description}
																		</p>
																		{result
																			?.evidence
																			.length ? (
																			<p>
																				Evidence:{' '}
																				{result.evidence.join(
																					'; ',
																				)}
																			</p>
																		) : null}
																	</TooltipContent>
																</Tooltip>
															);
														},
													)}
												</div>
											</CardContent>
										</Card>
									</div>

									<aside className="flex flex-col gap-4">
										<Card>
											<CardHeader>
												<CardTitle className="flex items-center gap-2 text-base">
													<MessageCircle className="size-4 text-muted-foreground" />
													Need help?
												</CardTitle>
												<CardDescription>
													Ask the assistant to
													strengthen or tailor this
													draft.
												</CardDescription>
											</CardHeader>
											<CardContent className="flex flex-col gap-2">
												<Button
													variant="secondary"
													onClick={() =>
														uiStateStore.setChatOpen(
															true,
														)
													}
												>
													<Sparkles data-icon="inline-start" />
													Ask AI
												</Button>
												<Button
													variant="outline"
													onClick={() =>
														checkpointsGuideRef.current?.scrollIntoView(
															{
																behavior:
																	'smooth',
																block: 'nearest',
															},
														)
													}
												>
													<CircleHelp data-icon="inline-start" />
													What makes a strong
													statement?
												</Button>
											</CardContent>
										</Card>

										<Card ref={checkpointsGuideRef}>
											<CardHeader>
												<CardTitle className="flex items-center gap-2 text-base">
													<CircleHelp className="size-4 text-muted-foreground" />
													Hitting the Checkpoints
												</CardTitle>
											</CardHeader>
											<CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
												<p>
													<span className="font-medium text-foreground">
														Who You Are:
													</span>{' '}
													State your role or title
													clearly (e.g., &quot;Senior
													Software Engineer&quot;)
												</p>
												<p>
													<span className="font-medium text-foreground">
														Your Foundation:
													</span>{' '}
													Mention experience level or
													background (e.g., &quot;8+
													years in fintech&quot;)
												</p>
												<p>
													<span className="font-medium text-foreground">
														What You Do:
													</span>{' '}
													Name specific skills or
													capabilities
												</p>
												<p>
													<span className="font-medium text-foreground">
														Your Impact:
													</span>{' '}
													Include a result or
													achievement
												</p>
												<p>
													<span className="font-medium text-foreground">
														Your Why:
													</span>{' '}
													Share what drives you or
													where you&apos;re heading
												</p>
												<p>
													<span className="font-medium text-foreground">
														Authenticity:
													</span>{' '}
													Align with your Professional
													Compass identity
												</p>
											</CardContent>
										</Card>

										<Card>
											<CardHeader>
												<CardTitle className="flex items-center gap-2 text-base">
													<Lightbulb className="size-4 text-muted-foreground" />
													Pro tips
												</CardTitle>
											</CardHeader>
											<CardContent>
												<ul className="flex list-disc flex-col gap-2 pl-4 text-sm text-muted-foreground">
													<li>
														Aim for two to four
														concise sentences.
													</li>
													<li>
														Lead with the strongest
														differentiator.
													</li>
													<li>
														Create a copy for each
														role or direction.
													</li>
												</ul>
											</CardContent>
										</Card>
									</aside>
								</div>
							</main>
						) : (
							<div className="grid flex-1 place-items-center p-6 text-sm text-muted-foreground">
								{profileStore.isSynced
									? 'No professional statements yet. Use New statement to create one.'
									: 'Connecting to your profile…'}
							</div>
						)}
					</div>
				</div>
			</div>
		</TooltipProvider>
	);
});
