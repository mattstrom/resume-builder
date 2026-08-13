import { useQuery } from '@apollo/client/react';
import { useEffect, useMemo, useState } from 'react';

import { RESOLVE_CONCEPT_LABELS } from '@/graphql/queries.ts';
import type {
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
	manualRequirementGradesSchema,
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
	manualRequirementGrades?: ManualRequirementGrades;
}

export function useProfileConceptEvaluation(applicationId: string, requirements: JobRequirement[]) {
	const {
		bulletsStore,
		educationStore,
		jobsStore,
		projectsStore,
		skillsStore,
		volunteeringStore,
	} = useStore();
	const [evaluation, setEvaluation] = useState<ConceptEvidenceEvaluation>();
	const [evaluatedInputHash, setEvaluatedInputHash] = useState('');
	const [currentInputHash, setCurrentInputHash] = useState('');
	const [isEvaluating, setIsEvaluating] = useState(false);
	const [manualRequirementGrades, setManualRequirementGrades] =
		useState<ManualRequirementGrades>({});

	const profile = useMemo(
		() => ({
			bullets: bulletsStore.bullets,
			educations: educationStore.educations,
			jobs: jobsStore.jobs,
			projects: projectsStore.projects,
			skills: skillsStore.skills,
			volunteering: volunteeringStore.volunteering,
		}),
		[
			bulletsStore.bullets,
			educationStore.educations,
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
			),
		[profile, resolvedLabelData?.resolveConceptLabels, summary],
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
				const manualGrades = manualRequirementGradesSchema.safeParse(
					parsed.manualRequirementGrades ?? {},
				);
				setManualRequirementGrades(manualGrades.success ? manualGrades.data : {});
			}
		} catch {
			localStorage.removeItem(`profile-concept-evaluation:${applicationId}`);
		}
	}, [applicationId, currentInputHash]);

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

	const saveCachedEvaluation = (
		result: ConceptEvidenceEvaluation,
		inputHash: string,
		manualGrades: ManualRequirementGrades,
	) => {
		const cached: CachedEvaluation = {
			evaluatorVersion: EVALUATOR_VERSION,
			inputHash,
			result,
			manualRequirementGrades: manualGrades,
		};
		localStorage.setItem(
			`profile-concept-evaluation:${applicationId}`,
			JSON.stringify(cached),
		);
	};

	const setManualRequirementGrade = (
		requirementId: string,
		grade?: EvidenceGrade,
	) => {
		if (!evaluation) return;
		setManualRequirementGrades((current) => {
			const next = { ...current };
			if (grade) next[requirementId] = grade;
			else delete next[requirementId];
			saveCachedEvaluation(evaluation, evaluatedInputHash || currentInputHash, next);
			return next;
		});
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
			saveCachedEvaluation(parsed, inputHash, manualRequirementGrades);
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
