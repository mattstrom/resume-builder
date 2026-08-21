import { BulletSourceType } from '@resume-builder/entities';

import { AgentSearchService } from './agent-search.service.js';

jest.mock('../crdt-client/crdt-api.service.js', () => ({
	CrdtApiService: class {},
}));
jest.mock('../entities/bullets/bullets.service.js', () => ({
	BulletsService: class {},
}));
jest.mock('../entities/jobs/jobs.service.js', () => ({
	JobsService: class {},
}));
jest.mock('../entities/projects/projects.service.js', () => ({
	ProjectsService: class {},
}));
jest.mock('../entities/resumes/resumes.service.js', () => ({
	ResumesService: class {},
}));
jest.mock('../entities/skills/skills.service.js', () => ({
	SkillsService: class {},
}));
jest.mock('../entities/volunteering/volunteering.service.js', () => ({
	VolunteeringService: class {},
}));
jest.mock('../facts/facts.service.js', () => ({ FactsService: class {} }));
jest.mock('./advanced-search.service.js', () => ({
	AdvancedSearchService: class {},
}));

describe('AgentSearchService', () => {
	const uid = 'auth0|owner';
	const advancedSearch = { search: jest.fn() };
	const resumes = { findAll: jest.fn() };
	const bullets = { findAll: jest.fn() };
	const facts = { findAll: jest.fn() };
	const jobs = { findAll: jest.fn() };
	const projects = { findAll: jest.fn() };
	const skills = { findAll: jest.fn() };
	const volunteering = { findAll: jest.fn() };
	const crdt = { readDocument: jest.fn() };
	let service: AgentSearchService;

	beforeEach(() => {
		jest.clearAllMocks();
		advancedSearch.search.mockResolvedValue({
			resumes: [],
			bullets: [],
			concepts: [],
		});
		for (const repository of [
			resumes,
			bullets,
			facts,
			jobs,
			projects,
			skills,
			volunteering,
		]) {
			repository.findAll.mockResolvedValue([]);
		}
		crdt.readDocument.mockResolvedValue({
			nodes: [],
			professionalStatements: [],
		});
		service = new AgentSearchService(
			advancedSearch as never,
			resumes as never,
			bullets as never,
			facts as never,
			jobs as never,
			projects as never,
			skills as never,
			volunteering as never,
			crdt as never,
		);
	});

	it('uses owner-scoped repositories and requested result types', async () => {
		skills.findAll.mockResolvedValue([
			{ _id: 'skill-1', name: 'Kubernetes', category: 'Platform' },
		]);

		const result = await service.search(uid, 'kubernetes', ['SKILL']);

		expect(skills.findAll).toHaveBeenCalledWith(uid);
		expect(resumes.findAll).not.toHaveBeenCalled();
		expect(result).toEqual([
			expect.objectContaining({
				id: 'SKILL:skill-1',
				type: 'SKILL',
				baseScore: 1,
				matchKinds: ['lexical'],
				locator: { kind: 'profile', section: 'skills' },
			}),
		]);
	});

	it('deduplicates lexical and semantic candidates', async () => {
		skills.findAll.mockResolvedValue([
			{ _id: 'skill-1', name: 'Kubernetes', category: 'Platform' },
		]);
		advancedSearch.search.mockResolvedValue({
			resumes: [],
			bullets: [],
			concepts: [
				{
					score: 0.82,
					concept: {
						id: 'concept-1',
						label: 'Kubernetes',
						key: 'Kubernetes',
					},
				},
			],
		});

		const result = await service.search(uid, 'kubernetes', ['SKILL']);

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			id: 'SKILL:skill-1',
			baseScore: 1,
			matchKinds: ['lexical', 'vector'],
		});
	});

	it('returns stable bullet locators for source-backed evidence', async () => {
		jobs.findAll.mockResolvedValue([
			{
				_id: 'job-1',
				position: 'Staff Engineer',
				company: 'Acme',
				responsibilities: [],
			},
		]);
		advancedSearch.search.mockResolvedValue({
			resumes: [],
			concepts: [],
			bullets: [
				{
					score: 0.9,
					bullet: {
						id: 'bullet-1',
						text: 'Led incident response',
						sourceType: BulletSourceType.JOB,
						sourceId: 'job-1',
					},
				},
			],
		});

		const result = await service.search(uid, 'reliability', [
			'WORK_HISTORY',
		]);

		expect(result[0]).toMatchObject({
			id: 'WORK_HISTORY:job-1',
			locator: {
				kind: 'bullet',
				bulletId: 'bullet-1',
				sourceType: BulletSourceType.JOB,
				sourceId: 'job-1',
			},
		});
	});

	it('reads professional statements from the authenticated profile document', async () => {
		crdt.readDocument.mockResolvedValue({
			nodes: [],
			professionalStatements: [
				{
					id: 'statement-1',
					label: 'Platform leader',
					text: 'I build reliable systems.',
				},
			],
		});

		const result = await service.search(uid, 'reliable', [
			'PROFESSIONAL_STATEMENT',
		]);

		expect(crdt.readDocument).toHaveBeenCalledWith(`profile:${uid}`);
		expect(result[0]).toMatchObject({
			id: 'PROFESSIONAL_STATEMENT:statement-1',
			locator: { kind: 'profile', section: 'statements' },
		});
	});
});
