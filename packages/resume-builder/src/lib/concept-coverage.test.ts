import { type Bullet, BulletSourceType, BulletStatus, type Resume } from '@resume-builder/entities';
import { describe, expect, it } from 'vitest';

import type { JobRequirement } from '@/graphql/types.ts';

import {
	buildConceptEvidenceEvaluationInput,
	conceptLabelsForResume,
	deriveConceptCoverage,
	hashConceptEvidenceEvaluationInput,
} from './concept-coverage.ts';

function requirement(
	id: string,
	conceptId: string,
	label: string,
	relation: 'requires' | 'prefers' | 'expects' = 'requires',
): JobRequirement {
	return {
		id,
		applicationId: 'application-1',
		kind: 'experience',
		what: `Experience with ${label}`,
		technologies: [],
		tags: [],
		createdAt: new Date().toISOString(),
		concepts: [
			{
				jobRequirementId: id,
				conceptId,
				relation,
				source: 'generated',
				concept: {
					id: conceptId,
					vocabulary: 'technology',
					key: conceptId,
					label,
				},
			},
		],
	};
}

function bullet(id: string, conceptId: string): Bullet {
	return {
		id,
		uid: 'user-1',
		text: `Used ${conceptId}`,
		sourceType: BulletSourceType.JOB,
		sourceId: 'job-1',
		status: BulletStatus.READY,
		position: 0,
		concepts: [
			{
				bulletId: id,
				conceptId,
				relation: 'uses',
				source: 'generated',
				concept: {
					id: conceptId,
					vocabulary: 'technology',
					key: conceptId,
					label: conceptId,
				},
			},
		],
	} as Bullet;
}

function resumeData(linkedBulletIds: string[]): Resume['data'] {
	return {
		_id: 'content-1',
		name: 'Candidate',
		title: 'Engineer',
		summary: '',
		contactInformation: {} as Resume['data']['contactInformation'],
		workExperience: [
			{
				_id: 'job-1',
				company: 'Acme',
				position: 'Engineer',
				startDate: '',
				endDate: '',
				location: '',
				responsibilities: linkedBulletIds.map((bulletId) => ({
					_id: `resume-${bulletId}`,
					bulletId,
					text: bulletId,
				})),
			},
		] as Resume['data']['workExperience'],
		education: [],
		skills: [],
		projects: [],
	};
}

describe('deriveConceptCoverage', () => {
	it('only covers concepts from bullets linked into the active resume', () => {
		const summary = deriveConceptCoverage(
			[requirement('req-react', 'react', 'React'), requirement('req-aws', 'aws', 'AWS')],
			[bullet('bullet-react', 'react'), bullet('bullet-aws', 'aws')],
			resumeData(['bullet-react']),
		);

		expect(summary.coveredCount).toBe(1);
		expect(summary.concepts.map(({ concept, covered }) => [concept.id, covered])).toEqual([
			['aws', false],
			['react', true],
		]);
	});

	it('deduplicates concepts and keeps their strongest requirement relation', () => {
		const summary = deriveConceptCoverage(
			[
				requirement('req-preferred', 'react', 'React', 'prefers'),
				requirement('req-required', 'react', 'React', 'requires'),
			],
			[],
			resumeData([]),
		);

		expect(summary.totalCount).toBe(1);
		expect(summary.concepts[0].relation).toBe('requires');
		expect(summary.concepts[0].requirements).toHaveLength(2);
	});
});

describe('buildConceptEvidenceEvaluationInput', () => {
	it('sends selected bullets and the surrounding resume context', () => {
		const bullets = [bullet('bullet-react', 'react'), bullet('bullet-aws', 'aws')];
		const resume = resumeData(['bullet-react']);
		const summary = deriveConceptCoverage(
			[requirement('req-react', 'react', 'React')],
			bullets,
			resume,
		);

		const input = buildConceptEvidenceEvaluationInput(summary, bullets, resume);

		expect(input.concepts).toEqual([
			{
				id: 'react',
				key: 'react',
				label: 'React',
				relation: 'requires',
				requirements: ['Experience with React'],
			},
		]);
		expect(input.evidenceItems).toEqual([
			{
				id: 'resume-title',
				label: 'Professional title',
				paths: ['data.title'],
				sourceType: 'title',
				text: 'Engineer',
				conceptIds: [],
				broaderConceptIds: [],
			},
			{
				id: 'experience-0',
				label: 'Acme',
				paths: ['data.workExperience.0'],
				sourceType: 'experience',
				text: 'Engineer at Acme',
				conceptIds: [],
				broaderConceptIds: [],
			},
			{
				id: 'bullet-react',
				label: 'Resume bullet',
				paths: ['data.workExperience.0.responsibilities.0'],
				sourceType: 'bullet',
				text: 'Used react',
				conceptIds: ['react'],
				broaderConceptIds: [],
			},
		]);
	});

	it('includes technologies listed in a skill group as evidence', () => {
		const resume = resumeData([]);
		resume.skillGroups = [
			{
				_id: 'group-1',
				uid: 'user-1',
				name: 'Languages',
				items: ['TypeScript', 'JavaScript'],
			},
		];
		const summary = deriveConceptCoverage(
			[requirement('req-typescript', 'typescript', 'TypeScript')],
			[],
			resume,
		);

		expect(
			buildConceptEvidenceEvaluationInput(summary, [], resume, [
				{
					label: 'TypeScript',
					conceptId: 'typescript',
					broaderConceptIds: [],
				},
			]).evidenceItems,
		).toContainEqual({
			id: 'skill-group-0-item-0',
			label: 'Languages',
			paths: ['data.skillGroups.0.items.0'],
			sourceType: 'skill',
			text: 'Languages: TypeScript',
			conceptIds: ['typescript'],
			broaderConceptIds: [],
		});
	});

	it('credits a skill whose spelling differs from the requirement concept', () => {
		// The previous in-browser matcher compared folded strings, so `k8s` and
		// `Kubernetes` never met. Resolution now happens server-side against the
		// technology lexicon, and this asserts the result is actually used.
		const resume = resumeData([]);
		resume.skills = [{ _id: 'skill-1', uid: 'user-1', name: 'k8s', category: 'Infra' }];
		const summary = deriveConceptCoverage(
			[requirement('req-k8s', 'kubernetes', 'Kubernetes')],
			[],
			resume,
		);

		expect(
			buildConceptEvidenceEvaluationInput(summary, [], resume, [
				{ label: 'k8s', conceptId: 'kubernetes', broaderConceptIds: [] },
			]).evidenceItems,
		).toContainEqual(
			expect.objectContaining({
				id: 'skill-0',
				sourceType: 'skill',
				conceptIds: ['kubernetes'],
				broaderConceptIds: [],
			}),
		);
	});

	it('keeps an ontology-only match out of the direct concept ids', () => {
		const resume = resumeData([]);
		resume.skills = [{ _id: 'skill-1', uid: 'user-1', name: 'React', category: 'Web' }];
		const summary = deriveConceptCoverage(
			[requirement('req-web', 'web-frameworks', 'Web Frameworks')],
			[],
			resume,
		);

		expect(
			buildConceptEvidenceEvaluationInput(summary, [], resume, [
				{
					label: 'React',
					conceptId: 'react',
					broaderConceptIds: ['web-frameworks'],
				},
			]).evidenceItems,
		).toContainEqual(
			expect.objectContaining({
				id: 'skill-0',
				conceptIds: [],
				broaderConceptIds: ['web-frameworks'],
			}),
		);
	});

	it('leaves labels the server could not resolve unmatched', () => {
		const resume = resumeData([]);
		resume.skills = [
			{
				_id: 'skill-1',
				uid: 'user-1',
				name: 'Frobnicator 9000',
				category: 'Internal',
			},
		];
		const summary = deriveConceptCoverage(
			[requirement('req-react', 'react', 'React')],
			[],
			resume,
		);

		expect(
			buildConceptEvidenceEvaluationInput(summary, [], resume, []).evidenceItems,
		).toContainEqual(
			expect.objectContaining({
				id: 'skill-0',
				conceptIds: [],
				broaderConceptIds: [],
			}),
		);
	});
});

describe('conceptLabelsForResume', () => {
	it('collects skill, skill-group, and project labels without duplicates', () => {
		const resume = resumeData([]);
		resume.skills = [{ _id: 'skill-1', uid: 'user-1', name: 'React', category: 'Web' }];
		resume.skillGroups = [
			{
				_id: 'group-1',
				uid: 'user-1',
				name: 'Languages',
				items: ['TypeScript', 'react'],
			},
		];
		resume.projects = [
			{
				_id: 'project-1',
				name: 'Platform',
				description: '',
				technologies: ['Kubernetes', 'TypeScript'],
				items: [],
			},
		] as unknown as Resume['data']['projects'];

		expect(conceptLabelsForResume(resume)).toEqual([
			'React',
			'Languages',
			'TypeScript',
			'Kubernetes',
		]);
	});
});

describe('hashConceptEvidenceEvaluationInput', () => {
	it('returns a stable SHA-256 digest and changes with the evidence', async () => {
		const resume = resumeData([]);
		const summary = deriveConceptCoverage([], [], resume);
		const input = buildConceptEvidenceEvaluationInput(summary, [], resume);

		const first = await hashConceptEvidenceEvaluationInput(input);
		const second = await hashConceptEvidenceEvaluationInput(input);
		const changed = await hashConceptEvidenceEvaluationInput({
			...input,
			concepts: [
				{
					id: 'typescript',
					key: 'typescript',
					label: 'TypeScript',
					relation: 'requires',
					requirements: ['Use TypeScript'],
				},
			],
		});

		expect(first).toMatch(/^[a-f0-9]{64}$/);
		expect(second).toBe(first);
		expect(changed).not.toBe(first);
	});
});
