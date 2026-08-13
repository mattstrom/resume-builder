import type {
	Bullet,
	Education,
	Job,
	Project,
	Resume,
	Skill,
	Volunteering,
} from '@resume-builder/entities';
import { BulletStatus } from '@resume-builder/entities';
import { z } from 'zod';

import type { JobRequirement, ResolvedConceptLabel } from '@/graphql/types.ts';

type RequirementRelation = JobRequirement['concepts'][number]['relation'];

const relationPriority: Record<RequirementRelation, number> = {
	requires: 0,
	expects: 1,
	prefers: 2,
};

export interface RequirementConceptCoverage {
	concept: JobRequirement['concepts'][number]['concept'];
	relation: RequirementRelation;
	requirements: Array<Pick<JobRequirement, 'id' | 'what'>>;
	covered: boolean;
}

export interface ConceptCoverageSummary {
	concepts: RequirementConceptCoverage[];
	coveredCount: number;
	totalCount: number;
}

export interface ProfileEvidence {
	bullets: Bullet[];
	educations: Education[];
	facts?: Array<{
		id: string;
		what: string;
		impact?: string;
		scale?: string;
		concepts: Array<{ conceptId: string; relation: string }>;
	}>;
	jobs: Job[];
	projects: Project[];
	skills: Skill[];
	volunteering: Volunteering[];
}

export function resumeBulletIds(data: Resume['data']): Set<string> {
	return new Set(
		[
			...data.workExperience.flatMap(({ responsibilities }) => responsibilities),
			...data.projects.flatMap(({ items }) => items),
			...(data.volunteering ?? []).flatMap(({ responsibilities }) => responsibilities),
		].flatMap(({ bulletId }) => (bulletId ? [bulletId] : [])),
	);
}

export const conceptEvidenceGradeSchema = z.enum(['strong', 'moderate', 'weak', 'missing']);

export const conceptEvidenceEvaluationSchema = z.object({
	evaluations: z.array(
		z.object({
			conceptId: z.string(),
			grade: conceptEvidenceGradeSchema,
			score: z.number().min(0).max(1),
			evidenceItemIds: z.array(z.string()),
			rationale: z.string(),
		}),
	),
	summary: z.string(),
});

export type ConceptEvidenceEvaluation = z.infer<typeof conceptEvidenceEvaluationSchema>;
export type EvidenceGrade = ConceptEvidenceEvaluation['evaluations'][number]['grade'];

export const manualRequirementGradesSchema = z.record(z.string(), conceptEvidenceGradeSchema);

export type ManualRequirementGrades = z.infer<typeof manualRequirementGradesSchema>;

const manualGradeScores: Record<EvidenceGrade, number> = {
	strong: 1,
	moderate: 0.7,
	weak: 0.4,
	missing: 0,
};

export interface RequirementEvidenceAssessment {
	agentGrade: EvidenceGrade;
	agentScore: number;
	grade: EvidenceGrade;
	score: number;
	manualGrade?: EvidenceGrade;
}

export function gradeForEvidenceScore(score: number): EvidenceGrade {
	if (score >= 0.85) return 'strong';
	if (score >= 0.6) return 'moderate';
	if (score >= 0.25) return 'weak';
	return 'missing';
}

export function deriveRequirementEvidenceAssessments(
	requirements: readonly JobRequirement[],
	evaluationByConceptId: ReadonlyMap<string, ConceptEvidenceEvaluation['evaluations'][number]>,
	manualGrades: ManualRequirementGrades = {},
): Map<string, RequirementEvidenceAssessment> {
	return new Map(
		requirements.flatMap((requirement) => {
			const scores = requirement.concepts.flatMap(({ conceptId }) => {
				const evaluation = evaluationByConceptId.get(conceptId);
				return evaluation ? [evaluation.score] : [];
			});
			if (scores.length === 0) return [];

			const agentScore = scores.reduce((total, score) => total + score, 0) / scores.length;
			const agentGrade = gradeForEvidenceScore(agentScore);
			const manualGrade = manualGrades[requirement.id];
			return [
				[
					requirement.id,
					{
						agentGrade,
						agentScore,
						grade: manualGrade ?? agentGrade,
						score: manualGrade ? manualGradeScores[manualGrade] : agentScore,
						manualGrade,
					},
				] as const,
			];
		}),
	);
}

export function scoreRequirementEvidenceAssessments(
	assessments: ReadonlyMap<string, RequirementEvidenceAssessment>,
): number {
	if (assessments.size === 0) return 0;
	return Math.round(
		([...assessments.values()].reduce((total, { score }) => total + score, 0) /
			assessments.size) *
			100,
	);
}

export interface ConceptEvidenceEvaluationInput {
	concepts: Array<{
		id: string;
		key: string;
		label: string;
		definition?: string;
		relation: RequirementRelation;
		requirements: string[];
	}>;
	evidenceItems: Array<{
		id: string;
		label: string;
		paths: string[];
		sourceType:
			| 'title'
			| 'summary'
			| 'skill'
			| 'experience'
			| 'project'
			| 'education'
			| 'fact'
			| 'volunteering'
			| 'bullet';
		text: string;
		/** Requirement concepts this item names directly. */
		conceptIds: string[];
		/** Requirement concepts reached only by walking up the ontology. */
		broaderConceptIds: string[];
	}>;
	profileGuidance: string[];
}

export async function hashConceptEvidenceEvaluationInput(
	input: ConceptEvidenceEvaluationInput,
): Promise<string> {
	const bytes = new TextEncoder().encode(JSON.stringify(input));
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(
		'',
	);
}

/**
 * The resume's free-text labels that carry semantics worth resolving.
 *
 * Skill names, skill-group names and items, and project technologies — every
 * place the resume states a capability as a bare string. Deduplicated
 * case-insensitively, since the resolver is queried with this list verbatim.
 */
export function conceptLabelsForResume(resume: Resume['data']): string[] {
	const labels = [
		...(resume.skills ?? []).map(({ name }) => name),
		...(resume.skillGroups ?? []).flatMap((group) => [group.name, ...group.items]),
		...resume.projects.flatMap(({ technologies }) => technologies),
	];
	const seen = new Set<string>();

	return labels.flatMap((label) => {
		const trimmed = label?.trim();
		const key = trimmed?.toLowerCase();

		if (!trimmed || !key || seen.has(key)) {
			return [];
		}

		seen.add(key);
		return [trimmed];
	});
}

export function conceptLabelsForProfile(profile: ProfileEvidence): string[] {
	const labels = [
		...profile.skills.map(({ name }) => name),
		...profile.projects.flatMap(({ technologies }) => technologies),
	];
	const seen = new Set<string>();

	return labels.flatMap((label) => {
		const trimmed = label?.trim();
		const key = trimmed?.toLowerCase();
		if (!trimmed || !key || seen.has(key)) return [];
		seen.add(key);
		return [trimmed];
	});
}

function conceptMatchers(
	summary: ConceptCoverageSummary,
	resolvedLabels: readonly ResolvedConceptLabel[],
) {
	const requirementConceptIds = new Set(summary.concepts.map(({ concept }) => concept.id));
	const matchesByLabel = new Map<string, { conceptIds: string[]; broaderConceptIds: string[] }>();

	for (const resolved of resolvedLabels) {
		const conceptIds = requirementConceptIds.has(resolved.conceptId)
			? [resolved.conceptId]
			: [];
		const broaderConceptIds = resolved.broaderConceptIds.filter((id) =>
			requirementConceptIds.has(id),
		);
		if (conceptIds.length > 0 || broaderConceptIds.length > 0) {
			matchesByLabel.set(resolved.label.toLowerCase(), { conceptIds, broaderConceptIds });
		}
	}

	return (labels: string[]) => {
		const matched = labels.filter(Boolean).flatMap((label) => {
			const match = matchesByLabel.get(label.toLowerCase());
			return match ? [match] : [];
		});
		return {
			conceptIds: [...new Set(matched.flatMap(({ conceptIds }) => conceptIds))],
			broaderConceptIds: [
				...new Set(matched.flatMap(({ broaderConceptIds }) => broaderConceptIds)),
			],
		};
	};
}

export function buildProfileConceptEvidenceEvaluationInput(
	summary: ConceptCoverageSummary,
	profile: ProfileEvidence,
	resolvedLabels: readonly ResolvedConceptLabel[] = [],
	profileGuidance: readonly string[] = [],
): ConceptEvidenceEvaluationInput {
	const evidenceItems: ConceptEvidenceEvaluationInput['evidenceItems'] = [];
	const conceptIdsForLabels = conceptMatchers(summary, resolvedLabels);
	const addEvidence = (item: ConceptEvidenceEvaluationInput['evidenceItems'][number]) => {
		const text = item.text.trim().slice(0, 2000);
		if (text) evidenceItems.push({ ...item, text });
	};

	for (const skill of profile.skills) {
		addEvidence({
			id: `profile-skill-${skill._id}`,
			label: skill.category || 'Skill',
			paths: [],
			sourceType: 'skill',
			text: [skill.name, skill.category].filter(Boolean).join(' — '),
			...conceptIdsForLabels([skill.name]),
		});
	}
	for (const fact of profile.facts ?? []) {
		addEvidence({
			id: `profile-fact-${fact.id}`,
			label: 'Confirmed profile fact',
			paths: [],
			sourceType: 'fact',
			text: [fact.what, fact.impact, fact.scale].filter(Boolean).join(' — '),
			conceptIds: fact.concepts
				.filter(({ conceptId }) =>
					summary.concepts.some(({ concept }) => concept.id === conceptId),
				)
				.map(({ conceptId }) => conceptId),
			broaderConceptIds: [],
		});
	}
	for (const project of profile.projects) {
		addEvidence({
			id: `profile-project-${project._id}`,
			label: project.name || 'Project',
			paths: [],
			sourceType: 'project',
			text: [project.name, project.description, project.technologies.join(', ')]
				.filter(Boolean)
				.join(' — '),
			...conceptIdsForLabels(project.technologies),
		});
	}
	for (const job of profile.jobs) {
		addEvidence({
			id: `profile-job-${job._id}`,
			label: job.company || 'Work experience',
			paths: [],
			sourceType: 'experience',
			text: [job.position, job.company, ...job.responsibilities].filter(Boolean).join(' — '),
			conceptIds: [],
			broaderConceptIds: [],
		});
	}
	for (const education of profile.educations) {
		addEvidence({
			id: `profile-education-${education._id}`,
			label: education.institution || 'Education',
			paths: [],
			sourceType: 'education',
			text: [education.degree, education.field, education.institution]
				.filter(Boolean)
				.join(' — '),
			conceptIds: [],
			broaderConceptIds: [],
		});
	}
	for (const role of profile.volunteering) {
		addEvidence({
			id: `profile-volunteering-${role._id}`,
			label: role.organization || 'Volunteering',
			paths: [],
			sourceType: 'volunteering',
			text: [role.position, role.organization, ...role.responsibilities]
				.filter(Boolean)
				.join(' — '),
			conceptIds: [],
			broaderConceptIds: [],
		});
	}
	for (const bullet of profile.bullets.filter(({ status }) => status !== BulletStatus.ARCHIVED)) {
		addEvidence({
			id: bullet.id,
			label: 'Career evidence',
			paths: [],
			sourceType: 'bullet',
			text: bullet.text,
			conceptIds: bullet.concepts.map(({ conceptId }) => conceptId),
			broaderConceptIds: [],
		});
	}

	return {
		concepts: summary.concepts.map(({ concept, relation, requirements }) => ({
			id: concept.id,
			key: concept.key,
			label: concept.label,
			...(concept.definition ? { definition: concept.definition } : {}),
			relation,
			requirements: requirements.map(({ what }) => what),
		})),
		evidenceItems: evidenceItems.slice(0, 200),
		profileGuidance: [...profileGuidance],
	};
}

export function buildConceptEvidenceEvaluationInput(
	summary: ConceptCoverageSummary,
	bullets: Bullet[],
	resume: Resume['data'],
	resolvedLabels: readonly ResolvedConceptLabel[] = [],
): ConceptEvidenceEvaluationInput {
	const selectedBulletIds = resumeBulletIds(resume);
	const evidenceItems: ConceptEvidenceEvaluationInput['evidenceItems'] = [];
	const bulletPaths = new Map<string, string[]>();
	const addBulletPath = (bulletId: string | undefined, path: string) => {
		if (!bulletId) return;
		bulletPaths.set(bulletId, [...(bulletPaths.get(bulletId) ?? []), path]);
	};
	for (const [jobIndex, job] of resume.workExperience.entries()) {
		for (const [itemIndex, responsibility] of job.responsibilities.entries()) {
			addBulletPath(
				responsibility.bulletId,
				`data.workExperience.${jobIndex}.responsibilities.${itemIndex}`,
			);
		}
	}
	for (const [projectIndex, project] of resume.projects.entries()) {
		for (const [itemIndex, item] of project.items.entries()) {
			addBulletPath(item.bulletId, `data.projects.${projectIndex}.items.${itemIndex}`);
		}
	}
	for (const [roleIndex, role] of (resume.volunteering ?? []).entries()) {
		for (const [itemIndex, responsibility] of role.responsibilities.entries()) {
			addBulletPath(
				responsibility.bulletId,
				`data.volunteering.${roleIndex}.responsibilities.${itemIndex}`,
			);
		}
	}
	// Resolution happens server-side against the technology lexicon, the learned
	// alias table, and the concept graph — so `k8s` reaches `Kubernetes`, which
	// comparing folded strings here never could.
	//
	// Exact and broader matches are kept apart because they are not equally
	// strong evidence. Listing `Kubernetes` against a Kubernetes requirement is a
	// direct claim; listing it against "container management software" only says
	// the author works somewhere in that space, which the evaluator should weigh
	// rather than be handed as a floor.
	const requirementConceptIds = new Set(summary.concepts.map(({ concept }) => concept.id));
	const matchesByLabel = new Map<string, { conceptIds: string[]; broaderConceptIds: string[] }>();
	for (const resolved of resolvedLabels) {
		const conceptIds = requirementConceptIds.has(resolved.conceptId)
			? [resolved.conceptId]
			: [];
		const broaderConceptIds = resolved.broaderConceptIds.filter((id) =>
			requirementConceptIds.has(id),
		);

		if (conceptIds.length > 0 || broaderConceptIds.length > 0) {
			matchesByLabel.set(resolved.label.toLowerCase(), {
				conceptIds,
				broaderConceptIds,
			});
		}
	}
	const conceptIdsForLabels = (labels: string[]) => {
		const matched = labels.filter(Boolean).flatMap((label) => {
			const match = matchesByLabel.get(label.toLowerCase());

			return match ? [match] : [];
		});

		return {
			conceptIds: [...new Set(matched.flatMap(({ conceptIds }) => conceptIds))],
			broaderConceptIds: [
				...new Set(matched.flatMap(({ broaderConceptIds }) => broaderConceptIds)),
			],
		};
	};
	const addEvidence = (item: ConceptEvidenceEvaluationInput['evidenceItems'][number]) => {
		if (item.text.trim()) {
			evidenceItems.push({ ...item, text: item.text.trim() });
		}
	};

	addEvidence({
		id: 'resume-title',
		label: 'Professional title',
		paths: ['data.title'],
		sourceType: 'title',
		text: resume.title,
		conceptIds: [],
		broaderConceptIds: [],
	});
	addEvidence({
		id: 'resume-summary',
		label: 'Professional summary',
		paths: ['data.summary'],
		sourceType: 'summary',
		text: resume.summary,
		conceptIds: [],
		broaderConceptIds: [],
	});

	for (const [index, group] of (resume.skillGroups ?? []).entries()) {
		for (const [itemIndex, skill] of group.items.entries()) {
			addEvidence({
				id: `skill-group-${index}-item-${itemIndex}`,
				label: group.name || 'Skill',
				paths: [`data.skillGroups.${index}.items.${itemIndex}`],
				sourceType: 'skill',
				text: [group.name, skill].filter(Boolean).join(': '),
				...conceptIdsForLabels([skill]),
			});
		}
		addEvidence({
			id: `skill-group-${index}-name`,
			label: 'Skill group',
			paths: [`data.skillGroups.${index}.name`],
			sourceType: 'skill',
			text: group.name,
			...conceptIdsForLabels([group.name]),
		});
	}
	const skillCategoryIndexes = new Map<string, number>();
	const skillIndexesWithinCategory = new Map<string, number>();
	for (const [index, skill] of (resume.skills ?? []).entries()) {
		const category = skill.category || 'Other';
		if (!skillCategoryIndexes.has(category)) {
			skillCategoryIndexes.set(category, skillCategoryIndexes.size);
		}
		const categoryIndex = skillCategoryIndexes.get(category) ?? 0;
		const itemIndex = skillIndexesWithinCategory.get(category) ?? 0;
		skillIndexesWithinCategory.set(category, itemIndex + 1);
		addEvidence({
			id: `skill-${index}`,
			label: skill.category || 'Skill',
			paths: [`data.skills.${index}`, `data.skills.${categoryIndex}.items.${itemIndex}`],
			sourceType: 'skill',
			text: [skill.name, skill.category].filter(Boolean).join(' — '),
			...conceptIdsForLabels([skill.name]),
		});
	}
	for (const [index, experience] of resume.workExperience.entries()) {
		addEvidence({
			id: `experience-${index}`,
			label: experience.company || 'Work experience',
			paths: [`data.workExperience.${index}`],
			sourceType: 'experience',
			text: [experience.position, experience.company].filter(Boolean).join(' at '),
			conceptIds: [],
			broaderConceptIds: [],
		});
	}
	for (const [index, project] of resume.projects.entries()) {
		addEvidence({
			id: `project-${index}`,
			label: project.name || 'Project',
			paths: [`data.projects.${index}`],
			sourceType: 'project',
			text: [project.name, project.description, project.technologies.join(', ')]
				.filter(Boolean)
				.join(' — '),
			...conceptIdsForLabels(project.technologies),
		});
	}
	for (const [index, education] of resume.education.entries()) {
		addEvidence({
			id: `education-${index}`,
			label: education.institution || 'Education',
			paths: [`data.education.${index}`],
			sourceType: 'education',
			text: [education.degree, education.field, education.institution]
				.filter(Boolean)
				.join(' — '),
			conceptIds: [],
			broaderConceptIds: [],
		});
	}
	for (const [index, volunteering] of (resume.volunteering ?? []).entries()) {
		addEvidence({
			id: `volunteering-${index}`,
			label: volunteering.organization || 'Volunteering',
			paths: [`data.volunteering.${index}`],
			sourceType: 'volunteering',
			text: [volunteering.position, volunteering.organization].filter(Boolean).join(' at '),
			conceptIds: [],
			broaderConceptIds: [],
		});
	}
	for (const bullet of bullets) {
		if (!selectedBulletIds.has(bullet.id)) continue;
		addEvidence({
			id: bullet.id,
			label: 'Resume bullet',
			paths: bulletPaths.get(bullet.id) ?? [],
			sourceType: 'bullet',
			text: bullet.text,
			conceptIds: bullet.concepts.map(({ conceptId }) => conceptId),
			broaderConceptIds: [],
		});
	}

	return {
		concepts: summary.concepts.map(({ concept, relation, requirements }) => ({
			id: concept.id,
			key: concept.key,
			label: concept.label,
			...(concept.definition ? { definition: concept.definition } : {}),
			relation,
			requirements: requirements.map(({ what }) => what),
		})),
		evidenceItems,
		profileGuidance: [],
	};
}

export function deriveConceptCoverage(
	requirements: JobRequirement[],
	bullets: Bullet[],
	resume: Resume['data'],
): ConceptCoverageSummary {
	const selectedBulletIds = resumeBulletIds(resume);
	const coveredConceptIds = new Set(
		bullets
			.filter(({ id }) => selectedBulletIds.has(id))
			.flatMap(({ concepts }) => concepts.map(({ conceptId }) => conceptId)),
	);
	const conceptsById = new Map<string, RequirementConceptCoverage>();

	for (const requirement of requirements) {
		for (const assertion of requirement.concepts) {
			const existing = conceptsById.get(assertion.conceptId);
			if (existing) {
				if (relationPriority[assertion.relation] < relationPriority[existing.relation]) {
					existing.relation = assertion.relation;
				}
				if (!existing.requirements.some(({ id }) => id === requirement.id)) {
					existing.requirements.push({
						id: requirement.id,
						what: requirement.what,
					});
				}
				continue;
			}

			conceptsById.set(assertion.conceptId, {
				concept: assertion.concept,
				relation: assertion.relation,
				requirements: [{ id: requirement.id, what: requirement.what }],
				covered: coveredConceptIds.has(assertion.conceptId),
			});
		}
	}

	const concepts = [...conceptsById.values()].sort(
		(left, right) =>
			Number(left.covered) - Number(right.covered) ||
			relationPriority[left.relation] - relationPriority[right.relation] ||
			left.concept.label.localeCompare(right.concept.label),
	);
	const coveredCount = concepts.filter(({ covered }) => covered).length;

	return { concepts, coveredCount, totalCount: concepts.length };
}

export function deriveProfileConceptCoverage(
	requirements: JobRequirement[],
	bullets: Bullet[],
): ConceptCoverageSummary {
	const allConceptIds = new Set(
		bullets
			.filter(({ status }) => status !== BulletStatus.ARCHIVED)
			.flatMap(({ concepts }) => concepts.map(({ conceptId }) => conceptId)),
	);
	const emptyResume = {
		workExperience: [],
		projects: [],
		volunteering: [],
	} as unknown as Resume['data'];
	const summary = deriveConceptCoverage(requirements, [], emptyResume);

	for (const coverage of summary.concepts) {
		coverage.covered = allConceptIds.has(coverage.concept.id);
	}
	summary.coveredCount = summary.concepts.filter(({ covered }) => covered).length;
	summary.concepts.sort(
		(left, right) =>
			Number(left.covered) - Number(right.covered) ||
			relationPriority[left.relation] - relationPriority[right.relation] ||
			left.concept.label.localeCompare(right.concept.label),
	);
	return summary;
}
