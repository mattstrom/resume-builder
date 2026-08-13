import { useMutation, useQuery } from '@apollo/client/react';
import { profileCuratorOutputSchema } from '@resume-builder/entities';
import { useEffect, useMemo, useState } from 'react';

import {
	RECORD_REQUIREMENT_GRADE_FEEDBACK,
	SAVE_PROFILE_KNOWLEDGE_PROPOSALS,
} from '@/graphql/mutations.ts';
import { GET_REQUIREMENT_GRADE_FEEDBACK, RESOLVE_CONCEPT_LABELS } from '@/graphql/queries.ts';
import type {
	GetRequirementGradeFeedbackData,
	GetRequirementGradeFeedbackVariables,
	JobRequirement,
	ResolveConceptLabelsData,
	ResolveConceptLabelsVariables,
} from '@/graphql/types.ts';
import {
	buildProfileConceptEvidenceEvaluationInput,
	conceptEvidenceEvaluationSchema,
	conceptLabelsForProfile,
	deriveRequirementEvidenceAssessments,
	deriveProfileConceptCoverage,
	hashConceptEvidenceEvaluationInput,
	type ConceptEvidenceEvaluation,
	type EvidenceGrade,
	type ManualRequirementGrades,
	scoreRequirementEvidenceAssessments,
} from '@/lib/concept-coverage.ts';
import { getMastraClient } from '@/lib/mastra-client.ts';
import { useStore } from '@/stores/store.provider.tsx';

const EVALUATOR_VERSION = 1;

interface CachedEvaluation {
	evaluatorVersion: number;
	inputHash: string;
	result: ConceptEvidenceEvaluation;
}

interface RecordRequirementGradeFeedbackData {
	recordRequirementGradeFeedback: { id: string };
}

interface RecordRequirementGradeFeedbackVariables {
	applicationId: string;
	jobRequirementId: string;
	agentGrade: EvidenceGrade;
	manualGrade: EvidenceGrade | null;
	explanation: string | null;
}

function errorMessage(error: unknown): string {
	if (error instanceof Error && error.message) return error.message;
	if (typeof error === 'string' && error) return error;
	if (error && typeof error === 'object' && 'message' in error) {
		const message = error.message;
		if (typeof message === 'string' && message) return message;
	}
	return 'Unknown profile curator error';
}

export function useProfileConceptEvaluation(applicationId: string, requirements: JobRequirement[]) {
	const {
		bulletsStore,
		educationStore,
		factsStore,
		jobsStore,
		projectsStore,
		skillsStore,
		volunteeringStore,
	} = useStore();
	const [evaluation, setEvaluation] = useState<ConceptEvidenceEvaluation>();
	const [evaluatedInputHash, setEvaluatedInputHash] = useState('');
	const [currentInputHash, setCurrentInputHash] = useState('');
	const [isEvaluating, setIsEvaluating] = useState(false);
	const [manualRequirementGrades, setManualRequirementGrades] = useState<ManualRequirementGrades>(
		{},
	);
	const { data: feedbackData, refetch: refetchFeedback } = useQuery<
		GetRequirementGradeFeedbackData,
		GetRequirementGradeFeedbackVariables
	>(GET_REQUIREMENT_GRADE_FEEDBACK, {
		variables: { applicationId },
		fetchPolicy: 'cache-and-network',
	});
	const [recordFeedback] = useMutation<
		RecordRequirementGradeFeedbackData,
		RecordRequirementGradeFeedbackVariables
	>(RECORD_REQUIREMENT_GRADE_FEEDBACK);
	const [saveProposals] = useMutation(SAVE_PROFILE_KNOWLEDGE_PROPOSALS);

	const profile = useMemo(
		() => ({
			bullets: bulletsStore.bullets,
			educations: educationStore.educations,
			facts: factsStore.facts,
			jobs: jobsStore.jobs,
			projects: projectsStore.projects,
			skills: skillsStore.skills,
			volunteering: volunteeringStore.volunteering,
		}),
		[
			bulletsStore.bullets,
			educationStore.educations,
			factsStore.facts,
			jobsStore.jobs,
			projectsStore.projects,
			skillsStore.skills,
			volunteeringStore.volunteering,
		],
	);
	const summary = useMemo(
		() => deriveProfileConceptCoverage(requirements, profile.bullets),
		[profile.bullets, requirements],
	);
	const conceptLabels = useMemo(() => conceptLabelsForProfile(profile), [profile]);
	const { data: resolvedLabelData } = useQuery<
		ResolveConceptLabelsData,
		ResolveConceptLabelsVariables
	>(RESOLVE_CONCEPT_LABELS, {
		variables: { labels: conceptLabels },
		skip: conceptLabels.length === 0,
		fetchPolicy: 'cache-first',
	});
	const evaluationInput = useMemo(
		() =>
			buildProfileConceptEvidenceEvaluationInput(
				summary,
				profile,
				resolvedLabelData?.resolveConceptLabels,
				feedbackData?.profileKnowledgeGuidance,
			),
		[
			feedbackData?.profileKnowledgeGuidance,
			profile,
			resolvedLabelData?.resolveConceptLabels,
			summary,
		],
	);
	const evaluationFingerprint = JSON.stringify(evaluationInput);

	useEffect(() => {
		setEvaluation(undefined);
		setEvaluatedInputHash('');
		setCurrentInputHash('');
		setManualRequirementGrades({});
	}, [applicationId]);

	useEffect(() => {
		let cancelled = false;
		void hashConceptEvidenceEvaluationInput(evaluationInput).then((hash) => {
			if (!cancelled) setCurrentInputHash(hash);
		});
		return () => {
			cancelled = true;
		};
	}, [evaluationFingerprint]);

	useEffect(() => {
		if (!currentInputHash) return;
		const cached = localStorage.getItem(`profile-concept-evaluation:${applicationId}`);
		if (!cached) return;
		try {
			const parsed = JSON.parse(cached) as CachedEvaluation;
			const result = conceptEvidenceEvaluationSchema.safeParse(parsed.result);
			if (result.success && parsed.evaluatorVersion === EVALUATOR_VERSION) {
				setEvaluation(result.data);
				setEvaluatedInputHash(parsed.inputHash);
			}
		} catch {
			localStorage.removeItem(`profile-concept-evaluation:${applicationId}`);
		}
	}, [applicationId, currentInputHash]);

	const feedbackByRequirementId = useMemo(() => {
		const latest = new Map<
			string,
			GetRequirementGradeFeedbackData['requirementGradeFeedback'][number]
		>();
		for (const feedback of feedbackData?.requirementGradeFeedback ?? []) {
			if (!latest.has(feedback.jobRequirementId)) {
				latest.set(feedback.jobRequirementId, feedback);
			}
		}
		return latest;
	}, [feedbackData?.requirementGradeFeedback]);

	useEffect(() => {
		const manualGrades: ManualRequirementGrades = {};
		for (const [requirementId, feedback] of feedbackByRequirementId) {
			if (feedback.manualGrade) {
				manualGrades[requirementId] = feedback.manualGrade as EvidenceGrade;
			}
		}
		setManualRequirementGrades(manualGrades);
	}, [feedbackByRequirementId]);

	const evaluationByConceptId = useMemo(
		() => new Map(evaluation?.evaluations.map((item) => [item.conceptId, item]) ?? []),
		[evaluation],
	);
	const evidenceById = useMemo(
		() => new Map(evaluationInput.evidenceItems.map((item) => [item.id, item])),
		[evaluationInput],
	);
	const requirementAssessmentById = useMemo(
		() =>
			deriveRequirementEvidenceAssessments(
				requirements,
				evaluationByConceptId,
				manualRequirementGrades,
			),
		[evaluationByConceptId, manualRequirementGrades, requirements],
	);
	const score = scoreRequirementEvidenceAssessments(requirementAssessmentById);

	const saveCachedEvaluation = (result: ConceptEvidenceEvaluation, inputHash: string) => {
		const cached: CachedEvaluation = {
			evaluatorVersion: EVALUATOR_VERSION,
			inputHash,
			result,
		};
		localStorage.setItem(`profile-concept-evaluation:${applicationId}`, JSON.stringify(cached));
	};

	const setManualRequirementGrade = async (
		requirementId: string,
		grade?: EvidenceGrade,
		explanation?: string,
	) => {
		if (!evaluation) return;
		const requirement = requirements.find(({ id }) => id === requirementId);
		const assessment = requirementAssessmentById.get(requirementId);
		if (!requirement || !assessment) return;

		const next = { ...manualRequirementGrades };
		if (grade) next[requirementId] = grade;
		else delete next[requirementId];
		setManualRequirementGrades(next);

		const feedbackResult = await recordFeedback({
			variables: {
				applicationId,
				jobRequirementId: requirementId,
				agentGrade: assessment.agentGrade,
				manualGrade: grade ?? null,
				explanation: explanation?.trim() || null,
			},
		});
		const feedbackId = feedbackResult.data?.recordRequirementGradeFeedback.id;

		try {
			if (feedbackId && grade && explanation?.trim()) {
				const client = await getMastraClient();
				const workflow = client.getWorkflow('profileCurationWorkflow');
				const run = await workflow.createRun();
				const result = await run.startAsync({
					inputData: {
						feedbackId,
						requirement: {
							id: requirement.id,
							what: requirement.what,
							concepts: requirement.concepts.map(({ concept, relation }) => ({
								label: concept.label,
								relation,
							})),
						},
						agentGrade: assessment.agentGrade,
						manualGrade: grade,
						explanation: explanation.trim(),
						existingFacts: factsStore.facts.map((fact) => ({
							id: fact.id,
							what: fact.what,
							concepts: fact.concepts.map(({ relation, concept }) => ({
								relation,
								label: concept.label,
							})),
						})),
					},
				});
				if (result.status !== 'success') {
					const cause =
						result.status === 'failed' ? errorMessage(result.error) : result.status;
					throw new Error(`The profile curator did not complete: ${cause}`);
				}
				const proposals = profileCuratorOutputSchema.parse(result.result);
				if (proposals.proposals.length > 0) {
					await saveProposals({ variables: { feedbackId, result: proposals } });
				}
			}
		} catch (error) {
			console.error('Profile learning failed after grade feedback was saved', error);
			throw new Error(
				`Grade saved, but the profile learning step could not be completed: ${errorMessage(error)}`,
			);
		} finally {
			await refetchFeedback();
		}
	};

	const evaluate = async () => {
		if (evaluationInput.concepts.length === 0) return;
		setIsEvaluating(true);
		try {
			const client = await getMastraClient();
			const workflow = client.getWorkflow('conceptEvidenceEvaluationWorkflow');
			const run = await workflow.createRun();
			const result = await run.startAsync({ inputData: evaluationInput });
			if (result.status !== 'success') {
				throw new Error('Profile expertise evaluation did not complete.');
			}

			const parsed = conceptEvidenceEvaluationSchema.parse(result.result);
			const inputHash = await hashConceptEvidenceEvaluationInput(evaluationInput);
			saveCachedEvaluation(parsed, inputHash);
			setEvaluation(parsed);
			setCurrentInputHash(inputHash);
			setEvaluatedInputHash(inputHash);
		} finally {
			setIsEvaluating(false);
		}
	};

	return {
		evaluate,
		evaluation,
		evaluationByConceptId,
		evidenceById,
		isEvaluating,
		isStale: Boolean(evaluation && currentInputHash && evaluatedInputHash !== currentInputHash),
		requirementAssessmentById,
		score,
		setManualRequirementGrade,
		summary,
	};
}
