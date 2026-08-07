import type { Bullet, Resume } from '@resume-builder/entities';
import { z } from 'zod';

import type { JobRequirement } from '@/graphql/types.ts';

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

export function resumeBulletIds(data: Resume['data']): Set<string> {
	return new Set(
		[
			...data.workExperience.flatMap(
				({ responsibilities }) => responsibilities,
			),
			...data.projects.flatMap(({ items }) => items),
			...(data.volunteering ?? []).flatMap(
				({ responsibilities }) => responsibilities,
			),
		].flatMap(({ bulletId }) => (bulletId ? [bulletId] : [])),
	);
}

export const conceptEvidenceGradeSchema = z.enum([
	'strong',
	'moderate',
	'weak',
	'missing',
]);

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

export type ConceptEvidenceEvaluation = z.infer<
	typeof conceptEvidenceEvaluationSchema
>;

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
		sourceType:
			| 'title'
			| 'summary'
			| 'skill'
			| 'experience'
			| 'project'
			| 'education'
			| 'volunteering'
			| 'bullet';
		text: string;
		conceptIds: string[];
	}>;
}

export function buildConceptEvidenceEvaluationInput(
	summary: ConceptCoverageSummary,
	bullets: Bullet[],
	resume: Resume['data'],
): ConceptEvidenceEvaluationInput {
	const selectedBulletIds = resumeBulletIds(resume);
	const evidenceItems: ConceptEvidenceEvaluationInput['evidenceItems'] = [];
	const normalizeConceptLabel = (value: string) =>
		value.toLowerCase().replace(/[^a-z0-9+#.]+/g, '');
	const conceptIdsForLabels = (labels: string[]) => {
		const normalizedLabels = new Set(
			labels.filter(Boolean).map(normalizeConceptLabel),
		);
		return summary.concepts
			.filter(({ concept }) =>
				[concept.label, concept.key].some((value) =>
					normalizedLabels.has(normalizeConceptLabel(value)),
				),
			)
			.map(({ concept }) => concept.id);
	};
	const addEvidence = (
		item: ConceptEvidenceEvaluationInput['evidenceItems'][number],
	) => {
		if (item.text.trim()) {
			evidenceItems.push({ ...item, text: item.text.trim() });
		}
	};

	addEvidence({
		id: 'resume-title',
		label: 'Professional title',
		sourceType: 'title',
		text: resume.title,
		conceptIds: [],
	});
	addEvidence({
		id: 'resume-summary',
		label: 'Professional summary',
		sourceType: 'summary',
		text: resume.summary,
		conceptIds: [],
	});

	for (const [index, group] of (resume.skillGroups ?? []).entries()) {
		addEvidence({
			id: `skill-group-${index}`,
			label: group.name || 'Skills',
			sourceType: 'skill',
			text: [group.name, group.items.filter(Boolean).join(', ')]
				.filter(Boolean)
				.join(': '),
			conceptIds: conceptIdsForLabels(group.items),
		});
	}
	for (const [index, skill] of (resume.skills ?? []).entries()) {
		addEvidence({
			id: `skill-${index}`,
			label: skill.category || 'Skill',
			sourceType: 'skill',
			text: [skill.name, skill.category].filter(Boolean).join(' — '),
			conceptIds: conceptIdsForLabels([skill.name]),
		});
	}
	for (const [index, experience] of resume.workExperience.entries()) {
		addEvidence({
			id: `experience-${index}`,
			label: experience.company || 'Work experience',
			sourceType: 'experience',
			text: [experience.position, experience.company]
				.filter(Boolean)
				.join(' at '),
			conceptIds: [],
		});
	}
	for (const [index, project] of resume.projects.entries()) {
		addEvidence({
			id: `project-${index}`,
			label: project.name || 'Project',
			sourceType: 'project',
			text: [
				project.name,
				project.description,
				project.technologies.join(', '),
			]
				.filter(Boolean)
				.join(' — '),
			conceptIds: conceptIdsForLabels(project.technologies),
		});
	}
	for (const [index, education] of resume.education.entries()) {
		addEvidence({
			id: `education-${index}`,
			label: education.institution || 'Education',
			sourceType: 'education',
			text: [education.degree, education.field, education.institution]
				.filter(Boolean)
				.join(' — '),
			conceptIds: [],
		});
	}
	for (const [index, volunteering] of (resume.volunteering ?? []).entries()) {
		addEvidence({
			id: `volunteering-${index}`,
			label: volunteering.organization || 'Volunteering',
			sourceType: 'volunteering',
			text: [volunteering.position, volunteering.organization]
				.filter(Boolean)
				.join(' at '),
			conceptIds: [],
		});
	}
	for (const bullet of bullets) {
		if (!selectedBulletIds.has(bullet.id)) continue;
		addEvidence({
			id: bullet.id,
			label: 'Resume bullet',
			sourceType: 'bullet',
			text: bullet.text,
			conceptIds: bullet.concepts.map(({ conceptId }) => conceptId),
		});
	}

	return {
		concepts: summary.concepts.map(
			({ concept, relation, requirements }) => ({
				id: concept.id,
				key: concept.key,
				label: concept.label,
				...(concept.definition
					? { definition: concept.definition }
					: {}),
				relation,
				requirements: requirements.map(({ what }) => what),
			}),
		),
		evidenceItems,
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
			.flatMap(({ concepts }) =>
				concepts.map(({ conceptId }) => conceptId),
			),
	);
	const conceptsById = new Map<string, RequirementConceptCoverage>();

	for (const requirement of requirements) {
		for (const assertion of requirement.concepts) {
			const existing = conceptsById.get(assertion.conceptId);
			if (existing) {
				if (
					relationPriority[assertion.relation] <
					relationPriority[existing.relation]
				) {
					existing.relation = assertion.relation;
				}
				if (
					!existing.requirements.some(
						({ id }) => id === requirement.id,
					)
				) {
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
			relationPriority[left.relation] -
				relationPriority[right.relation] ||
			left.concept.label.localeCompare(right.concept.label),
	);
	const coveredCount = concepts.filter(({ covered }) => covered).length;

	return { concepts, coveredCount, totalCount: concepts.length };
}
