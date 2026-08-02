import { vocabulary } from '../core/vocabulary.js';

/**
 * How senior a position is — a separate dimension from {@link role}.
 *
 * `rank` is the level number. The two tracks are numbered on one shared scale so
 * that `staff` (5) and `manager` (5) compare as peers, which is how dual-ladder
 * companies actually treat them. Comparisons across tracks are approximate by
 * nature; see {@link compareSeniority}.
 */
export const seniority = vocabulary(
	'seniority',
	{
		'individual-contributor': {
			label: 'Individual Contributor',
			definition: 'Track where scope grows through technical work rather than reports.',
			synonyms: ['IC', 'IC Track'],
		},
		intern: {
			label: 'Intern',
			parent: 'individual-contributor',
			rank: 1,
			synonyms: ['Internship', 'Co-op'],
		},
		junior: {
			label: 'Junior',
			parent: 'individual-contributor',
			rank: 2,
			synonyms: ['Entry Level', 'Associate', 'Engineer I', 'L3', 'Graduate'],
		},
		mid: {
			label: 'Mid-Level',
			parent: 'individual-contributor',
			rank: 3,
			synonyms: ['Intermediate', 'Engineer II', 'L4'],
		},
		senior: {
			label: 'Senior',
			parent: 'individual-contributor',
			rank: 4,
			synonyms: ['Senior Engineer', 'Engineer III', 'Sr', 'L5'],
		},
		staff: {
			label: 'Staff',
			parent: 'individual-contributor',
			rank: 5,
			synonyms: ['Staff Engineer', 'Lead Engineer', 'Tech Lead', 'L6'],
		},
		'senior-staff': {
			label: 'Senior Staff',
			parent: 'individual-contributor',
			rank: 6,
			synonyms: ['Senior Staff Engineer', 'L7'],
		},
		principal: {
			label: 'Principal',
			parent: 'individual-contributor',
			rank: 7,
			synonyms: ['Principal Engineer', 'L8'],
		},
		distinguished: {
			label: 'Distinguished',
			parent: 'individual-contributor',
			rank: 8,
			synonyms: ['Distinguished Engineer', 'Fellow', 'Technical Fellow'],
		},

		'people-management': {
			label: 'People Management',
			definition: 'Track where scope grows through organizational responsibility.',
			synonyms: ['Management Track', 'Manager Track'],
		},
		lead: {
			label: 'Team Lead',
			parent: 'people-management',
			rank: 4,
			definition: 'Leads a team without full management authority.',
			synonyms: ['Team Leader'],
		},
		manager: {
			label: 'Manager',
			parent: 'people-management',
			rank: 5,
			synonyms: ['Engineering Manager', 'Line Manager'],
		},
		'senior-manager': {
			label: 'Senior Manager',
			parent: 'people-management',
			rank: 6,
			synonyms: ['Group Manager', 'Manager of Managers'],
		},
		director: {
			label: 'Director',
			parent: 'people-management',
			rank: 7,
			synonyms: ['Head of'],
		},
		'senior-director': { label: 'Senior Director', parent: 'people-management', rank: 8 },
		vp: {
			label: 'Vice President',
			parent: 'people-management',
			rank: 9,
			synonyms: ['VP', 'Vice-President'],
		},
		executive: {
			label: 'Executive',
			parent: 'people-management',
			rank: 10,
			synonyms: ['C-Level', 'CTO', 'Chief Technology Officer', 'SVP', 'EVP'],
		},
	},
	{
		title: 'Seniority',
		description: 'Level of a position on either the IC or people-management track.',
	},
);

export type SeniorityId = (typeof seniority)['keys'][number];

/** The level number for a seniority concept, or 0 for the two track roots. */
export function seniorityRank(id: SeniorityId): number {
	return seniority.get(id).rank ?? 0;
}

/**
 * Order two seniority concepts. Negative when `a` is more junior than `b`.
 *
 * Levels are comparable across tracks because both are numbered on one scale,
 * but treat a cross-track result as a rough equivalence rather than a strict
 * ordering — `staff` and `manager` are peers in scope, not in kind.
 */
export function compareSeniority(a: SeniorityId, b: SeniorityId): number {
	return seniorityRank(a) - seniorityRank(b);
}

/** True when `candidate` is at or above the level a posting asks for. */
export function meetsSeniority(candidate: SeniorityId, required: SeniorityId): boolean {
	return seniorityRank(candidate) >= seniorityRank(required);
}
