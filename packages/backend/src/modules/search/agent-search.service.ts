import { Injectable, Logger } from '@nestjs/common';
import {
	type AgentSearchCandidate,
	type AgentSearchMatchKind,
	type AgentSearchResultType,
	BulletSourceType,
} from '@resume-builder/entities';

import { CrdtApiService } from '../crdt-client/crdt-api.service.js';
import { BulletsService } from '../entities/bullets/bullets.service.js';
import { JobsService } from '../entities/jobs/jobs.service.js';
import { ProjectsService } from '../entities/projects/projects.service.js';
import { ResumesService } from '../entities/resumes/resumes.service.js';
import { SkillsService } from '../entities/skills/skills.service.js';
import { VolunteeringService } from '../entities/volunteering/volunteering.service.js';
import { FactsService } from '../facts/facts.service.js';
import { AdvancedSearchResultType } from './advanced-search.graphql.js';
import { AdvancedSearchService } from './advanced-search.service.js';

type CandidateInput = Omit<AgentSearchCandidate, 'matchKinds'> & {
	matchKinds: AgentSearchMatchKind[];
};

const SOURCE_RESULT_TYPES: Record<
	BulletSourceType,
	Extract<AgentSearchResultType, 'WORK_HISTORY' | 'PROJECT' | 'VOLUNTEERING'>
> = {
	[BulletSourceType.JOB]: 'WORK_HISTORY',
	[BulletSourceType.PROJECT]: 'PROJECT',
	[BulletSourceType.VOLUNTEERING]: 'VOLUNTEERING',
};

@Injectable()
export class AgentSearchService {
	private readonly logger = new Logger(AgentSearchService.name);

	constructor(
		private readonly advancedSearch: AdvancedSearchService,
		private readonly resumes: ResumesService,
		private readonly bullets: BulletsService,
		private readonly facts: FactsService,
		private readonly jobs: JobsService,
		private readonly projects: ProjectsService,
		private readonly skills: SkillsService,
		private readonly volunteering: VolunteeringService,
		private readonly crdt: CrdtApiService,
	) {}

	async search(
		uid: string,
		query: string,
		resultTypes: AgentSearchResultType[],
		requestedLimit = 50,
	): Promise<AgentSearchCandidate[]> {
		const text = query.trim();
		if (text.length < 2 || resultTypes.length === 0) return [];

		const requested = new Set(resultTypes);
		const limit = Math.max(1, Math.min(requestedLimit, 60));
		const [
			semantic,
			resumes,
			bullets,
			facts,
			jobs,
			projects,
			skills,
			volunteering,
			profile,
		] = await Promise.all([
			this.semanticSearch(uid, text, resultTypes, limit),
			requested.has('SUMMARY')
				? this.resumes.findAll(uid)
				: Promise.resolve([]),
			requested.has('BULLET') ||
			requested.has('WORK_HISTORY') ||
			requested.has('PROJECT') ||
			requested.has('VOLUNTEERING')
				? this.bullets.findAll(uid)
				: Promise.resolve([]),
			requested.has('FACT')
				? this.facts.findAll(uid)
				: Promise.resolve([]),
			requested.has('WORK_HISTORY')
				? this.jobs.findAll(uid)
				: Promise.resolve([]),
			requested.has('PROJECT')
				? this.projects.findAll(uid)
				: Promise.resolve([]),
			requested.has('SKILL')
				? this.skills.findAll(uid)
				: Promise.resolve([]),
			requested.has('VOLUNTEERING')
				? this.volunteering.findAll(uid)
				: Promise.resolve([]),
			requested.has('PROFESSIONAL_STATEMENT')
				? this.crdt.readDocument(`profile:${uid}`).catch(() => ({
						nodes: [],
						professionalStatements: [],
					}))
				: Promise.resolve({ nodes: [], professionalStatements: [] }),
		]);

		const jobById = new Map(jobs.map((job) => [job._id, job]));
		const projectById = new Map(
			projects.map((project) => [project._id, project]),
		);
		const volunteeringById = new Map(
			volunteering.map((item) => [item._id, item]),
		);
		const candidates = new Map<string, AgentSearchCandidate>();
		const add = (candidate: CandidateInput) =>
			this.merge(candidates, candidate);

		for (const resume of resumes) {
			const summary = resume.data?.summary ?? '';
			if (!matches(text, [resume.name, resume.company, summary]))
				continue;
			add({
				id: `SUMMARY:${resume._id}`,
				type: 'SUMMARY',
				title: resume.name || 'Untitled resume',
				excerpt: summary || 'No resume summary available.',
				source:
					resume.company || (resume.base ? 'Base resume' : 'Resume'),
				locator: {
					kind: 'resume',
					resumeId: resume._id,
					applicationId: resume.applicationId,
				},
				baseScore: 1,
				matchKinds: ['lexical'],
			});
		}

		for (const skill of skills) {
			if (!matches(text, [skill.name, skill.category])) continue;
			add({
				id: `SKILL:${skill._id}`,
				type: 'SKILL',
				title: skill.name,
				excerpt: skill.category || 'Uncategorized skill',
				source: 'Profile skills',
				locator: { kind: 'profile', section: 'skills' },
				baseScore: 1,
				matchKinds: ['lexical'],
			});
		}

		for (const project of projects) {
			if (
				!matches(text, [
					project.name,
					project.description,
					...project.technologies,
					...project.items,
				])
			) {
				continue;
			}
			add({
				id: `PROJECT:${project._id}`,
				type: 'PROJECT',
				title: project.name,
				excerpt:
					project.description ||
					project.technologies.join(', ') ||
					project.items.join(' '),
				source: 'Profile projects',
				locator: { kind: 'profile', section: 'projects' },
				baseScore: 1,
				matchKinds: ['lexical'],
			});
		}

		for (const job of jobs) {
			if (
				!matches(text, [
					job.position,
					job.company,
					...job.responsibilities,
				])
			)
				continue;
			add({
				id: `WORK_HISTORY:${job._id}`,
				type: 'WORK_HISTORY',
				title: `${job.position} at ${job.company}`,
				excerpt: job.responsibilities.join(' '),
				source: 'Profile work history',
				locator: { kind: 'profile', section: 'work-history' },
				baseScore: 1,
				matchKinds: ['lexical'],
			});
		}

		for (const item of volunteering) {
			if (
				!matches(text, [
					item.position,
					item.organization,
					...item.responsibilities,
				])
			) {
				continue;
			}
			add({
				id: `VOLUNTEERING:${item._id}`,
				type: 'VOLUNTEERING',
				title: [item.position, item.organization]
					.filter(Boolean)
					.join(' at '),
				excerpt: item.responsibilities.join(' '),
				source: 'Profile volunteering',
				locator: { kind: 'profile', section: 'volunteering' },
				baseScore: 1,
				matchKinds: ['lexical'],
			});
		}

		for (const fact of facts) {
			if (!matches(text, [fact.what, fact.impact, fact.scale])) continue;
			add({
				id: `FACT:${fact.id}`,
				type: 'FACT',
				title: fact.what,
				excerpt: [fact.impact, fact.scale].filter(Boolean).join(' · '),
				source: 'Profile facts',
				locator: { kind: 'profile', section: 'facts' },
				baseScore: 1,
				matchKinds: ['lexical'],
			});
		}

		for (const bullet of bullets) {
			if (!matches(text, [bullet.text])) continue;
			const sourceType = SOURCE_RESULT_TYPES[bullet.sourceType];
			const presentation = sourcePresentation(
				bullet.sourceType,
				bullet.sourceId,
				jobById,
				projectById,
				volunteeringById,
			);
			const locator = {
				kind: 'bullet' as const,
				bulletId: bullet.id,
				sourceType: bullet.sourceType,
				sourceId: bullet.sourceId,
			};
			if (requested.has('BULLET')) {
				add({
					id: `BULLET:${bullet.id}`,
					type: 'BULLET',
					title: presentation.title,
					excerpt: bullet.text,
					source: presentation.source,
					locator,
					baseScore: 1,
					matchKinds: ['lexical'],
				});
			}
			if (requested.has(sourceType)) {
				add({
					id: `${sourceType}:${bullet.sourceId}`,
					type: sourceType,
					title: presentation.title,
					excerpt: bullet.text,
					source: presentation.source,
					locator,
					baseScore: 1,
					matchKinds: ['lexical'],
				});
			}
		}

		if (requested.has('CONCEPT')) {
			const conceptLinks = [...bullets, ...facts].flatMap(
				(record) => record.concepts,
			);
			for (const { concept } of conceptLinks) {
				if (
					!matches(text, [
						concept.label,
						concept.key,
						concept.vocabulary,
						concept.definition,
					])
				) {
					continue;
				}
				add({
					id: `CONCEPT:${concept.id}`,
					type: 'CONCEPT',
					title: concept.label,
					excerpt:
						concept.definition ||
						`${concept.vocabulary} · ${concept.key}`,
					source: 'Profile concepts',
					locator: { kind: 'profile', section: 'concepts' },
					baseScore: 1,
					matchKinds: ['lexical'],
				});
			}
		}

		for (const statement of profile.professionalStatements) {
			if (!matches(text, [statement.label, statement.text])) continue;
			const id = statement.id?.trim();
			if (!id) continue;
			add({
				id: `PROFESSIONAL_STATEMENT:${id}`,
				type: 'PROFESSIONAL_STATEMENT',
				title: statement.label?.trim() || 'Untitled statement',
				excerpt:
					statement.text?.trim() || 'Empty professional statement',
				source: 'Profile statements',
				locator: { kind: 'profile', section: 'statements' },
				baseScore: 1,
				matchKinds: ['lexical'],
			});
		}

		for (const resume of semantic.resumes) {
			add({
				id: `SUMMARY:${resume.resumeId}`,
				type: 'SUMMARY',
				title: resume.name || 'Untitled resume',
				excerpt:
					resume.summary?.summaryTheme ||
					resume.summary?.dominantTheme ||
					'Semantically similar resume summary',
				source:
					resume.company || (resume.base ? 'Base resume' : 'Resume'),
				locator: {
					kind: 'resume',
					resumeId: resume.resumeId,
					applicationId: resume.applicationId,
				},
				baseScore: Math.min(1, Math.max(0, resume.score * 60)),
				matchKinds: ['vector'],
			});
		}

		for (const { bullet, score } of semantic.bullets) {
			const sourceType = SOURCE_RESULT_TYPES[bullet.sourceType];
			const presentation = sourcePresentation(
				bullet.sourceType,
				bullet.sourceId,
				jobById,
				projectById,
				volunteeringById,
			);
			if (requested.has('BULLET')) {
				add({
					id: `BULLET:${bullet.id}`,
					type: 'BULLET',
					title: presentation.title,
					excerpt: bullet.text,
					source: presentation.source,
					locator: {
						kind: 'bullet',
						bulletId: bullet.id,
						sourceType: bullet.sourceType,
						sourceId: bullet.sourceId,
					},
					baseScore: score,
					matchKinds: ['vector'],
				});
			}
			if (requested.has(sourceType)) {
				add({
					id: `${sourceType}:${bullet.sourceId}`,
					type: sourceType,
					title: presentation.title,
					excerpt: bullet.text,
					source: presentation.source,
					locator: {
						kind: 'bullet',
						bulletId: bullet.id,
						sourceType: bullet.sourceType,
						sourceId: bullet.sourceId,
					},
					baseScore: score,
					matchKinds: ['vector'],
				});
			}
		}

		const semanticConceptIds = new Map(
			semantic.concepts.map(({ concept, score }) => [concept.id, score]),
		);
		const semanticConceptLabels = new Map(
			semantic.concepts.flatMap(({ concept, score }) => [
				[normalize(concept.label), score] as const,
				[normalize(concept.key), score] as const,
			]),
		);
		if (requested.has('CONCEPT')) {
			for (const { concept, score } of semantic.concepts) {
				add({
					id: `CONCEPT:${concept.id}`,
					type: 'CONCEPT',
					title: concept.label,
					excerpt:
						concept.definition ||
						`${concept.vocabulary} · ${concept.key}`,
					source: 'Profile concepts',
					locator: { kind: 'profile', section: 'concepts' },
					baseScore: score,
					matchKinds: ['vector'],
				});
			}
		}
		for (const skill of skills) {
			const score = semanticConceptLabels.get(normalize(skill.name));
			if (score === undefined) continue;
			add({
				id: `SKILL:${skill._id}`,
				type: 'SKILL',
				title: skill.name,
				excerpt: skill.category || 'Semantically related skill',
				source: 'Profile skills',
				locator: { kind: 'profile', section: 'skills' },
				baseScore: score,
				matchKinds: ['vector'],
			});
		}
		for (const project of projects) {
			const scores = project.technologies.flatMap((technology) => {
				const score = semanticConceptLabels.get(normalize(technology));
				return score === undefined ? [] : [score];
			});
			if (scores.length === 0) continue;
			add({
				id: `PROJECT:${project._id}`,
				type: 'PROJECT',
				title: project.name,
				excerpt: project.description || project.technologies.join(', '),
				source: 'Profile projects',
				locator: { kind: 'profile', section: 'projects' },
				baseScore: Math.max(...scores),
				matchKinds: ['vector'],
			});
		}
		for (const fact of facts) {
			const scores = fact.concepts.flatMap(({ conceptId }) => {
				const score = semanticConceptIds.get(conceptId);
				return score === undefined ? [] : [score];
			});
			if (scores.length === 0) continue;
			add({
				id: `FACT:${fact.id}`,
				type: 'FACT',
				title: fact.what,
				excerpt:
					fact.impact ||
					fact.scale ||
					'Semantically related profile fact',
				source: 'Profile facts',
				locator: { kind: 'profile', section: 'facts' },
				baseScore: Math.max(...scores),
				matchKinds: ['vector'],
			});
		}

		return [...candidates.values()]
			.sort(
				(left, right) =>
					right.baseScore - left.baseScore ||
					left.id.localeCompare(right.id),
			)
			.slice(0, limit);
	}

	private async semanticSearch(
		uid: string,
		query: string,
		resultTypes: AgentSearchResultType[],
		limit: number,
	) {
		try {
			return await this.advancedSearch.search(
				uid,
				query,
				resultTypes as AdvancedSearchResultType[],
				limit,
				0.35,
			);
		} catch (error) {
			this.logger.warn(
				`Semantic candidate retrieval failed; continuing with lexical candidates: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
			return { resumes: [], bullets: [], concepts: [] };
		}
	}

	private merge(
		candidates: Map<string, AgentSearchCandidate>,
		candidate: CandidateInput,
	): void {
		const current = candidates.get(candidate.id);
		if (!current) {
			candidates.set(candidate.id, candidate);
			return;
		}
		current.baseScore = Math.max(current.baseScore, candidate.baseScore);
		current.matchKinds = [
			...new Set([...current.matchKinds, ...candidate.matchKinds]),
		];
	}
}

function matches(
	query: string,
	values: Array<string | null | undefined>,
): boolean {
	const normalized = query.toLocaleLowerCase();
	return values.some((value) =>
		value?.toLocaleLowerCase().includes(normalized),
	);
}

function normalize(value: string): string {
	return value
		.trim()
		.toLocaleLowerCase()
		.replaceAll(/[^a-z0-9]+/g, '-');
}

function sourcePresentation(
	type: BulletSourceType,
	id: string,
	jobs: Map<string, { company: string; position: string }>,
	projects: Map<string, { name: string }>,
	volunteering: Map<string, { organization?: string; position: string }>,
): { title: string; source: string } {
	if (type === BulletSourceType.JOB) {
		const job = jobs.get(id);
		return {
			title: job
				? `${job.position} at ${job.company}`
				: 'Work responsibility',
			source: 'Profile work history',
		};
	}
	if (type === BulletSourceType.PROJECT) {
		return {
			title: projects.get(id)?.name || 'Project evidence',
			source: 'Profile projects',
		};
	}
	const item = volunteering.get(id);
	return {
		title:
			[item?.position, item?.organization].filter(Boolean).join(' at ') ||
			'Volunteer responsibility',
		source: 'Profile volunteering',
	};
}
