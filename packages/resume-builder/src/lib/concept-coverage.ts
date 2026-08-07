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
		paths: string[];
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

export async function hashConceptEvidenceEvaluationInput(
	input: ConceptEvidenceEvaluationInput,
): Promise<string> {
	const bytes = new TextEncoder().encode(JSON.stringify(input));
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	return Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, '0'),
	).join('');
}

export function buildConceptEvidenceEvaluationInput(
	summary: ConceptCoverageSummary,
	bullets: Bullet[],
	resume: Resume['data'],
): ConceptEvidenceEvaluationInput {
	const selectedBulletIds = resumeBulletIds(resume);
	const evidenceItems: ConceptEvidenceEvaluationInput['evidenceItems'] = [];
	const bulletPaths = new Map<string, string[]>();
	const addBulletPath = (bulletId: string | undefined, path: string) => {
		if (!bulletId) return;
		bulletPaths.set(bulletId, [...(bulletPaths.get(bulletId) ?? []), path]);
	};
	for (const [jobIndex, job] of resume.workExperience.entries()) {
		for (const [
			itemIndex,
			responsibility,
		] of job.responsibilities.entries()) {
			addBulletPath(
				responsibility.bulletId,
				`data.workExperience.${jobIndex}.responsibilities.${itemIndex}`,
			);
		}
	}
	for (const [projectIndex, project] of resume.projects.entries()) {
		for (const [itemIndex, item] of project.items.entries()) {
			addBulletPath(
				item.bulletId,
				`data.projects.${projectIndex}.items.${itemIndex}`,
			);
		}
	}
	for (const [roleIndex, role] of (resume.volunteering ?? []).entries()) {
		for (const [
			itemIndex,
			responsibility,
		] of role.responsibilities.entries()) {
			addBulletPath(
				responsibility.bulletId,
				`data.volunteering.${roleIndex}.responsibilities.${itemIndex}`,
			);
		}
	}
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
		paths: ['data.title'],
		sourceType: 'title',
		text: resume.title,
		conceptIds: [],
	});
	addEvidence({
		id: 'resume-summary',
		label: 'Professional summary',
		paths: ['data.summary'],
		sourceType: 'summary',
		text: resume.summary,
		conceptIds: [],
	});

	for (const [index, group] of (resume.skillGroups ?? []).entries()) {
		for (const [itemIndex, skill] of group.items.entries()) {
			addEvidence({
				id: `skill-group-${index}-item-${itemIndex}`,
				label: group.name || 'Skill',
				paths: [`data.skillGroups.${index}.items.${itemIndex}`],
				sourceType: 'skill',
				text: [group.name, skill].filter(Boolean).join(': '),
				conceptIds: conceptIdsForLabels([skill]),
			});
		}
		addEvidence({
			id: `skill-group-${index}-name`,
			label: 'Skill group',
			paths: [`data.skillGroups.${index}.name`],
			sourceType: 'skill',
			text: group.name,
			conceptIds: conceptIdsForLabels([group.name]),
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
			paths: [
				`data.skills.${index}`,
				`data.skills.${categoryIndex}.items.${itemIndex}`,
			],
			sourceType: 'skill',
			text: [skill.name, skill.category].filter(Boolean).join(' — '),
			conceptIds: conceptIdsForLabels([skill.name]),
		});
	}
	for (const [index, experience] of resume.workExperience.entries()) {
		addEvidence({
			id: `experience-${index}`,
			label: experience.company || 'Work experience',
			paths: [`data.workExperience.${index}`],
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
			paths: [`data.projects.${index}`],
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
			paths: [`data.education.${index}`],
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
			paths: [`data.volunteering.${index}`],
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
			paths: bulletPaths.get(bullet.id) ?? [],
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
