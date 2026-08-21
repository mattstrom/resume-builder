import { BulletSourceType } from '@resume-builder/entities';

import type { ConceptsService } from '../concepts/concepts.service.js';
import type { BulletsService } from '../entities/bullets/bullets.service.js';
import type { ResumesService } from '../entities/resumes/resumes.service.js';
import type { EmbeddingService } from '../queue/embeddings/embedding.service.js';
import { AdvancedSearchResultType } from './advanced-search.graphql.js';
import { AdvancedSearchService } from './advanced-search.service.js';

jest.mock('@resume-builder/entities', () => ({
	BulletSourceType: { JOB: 'job', PROJECT: 'project', VOLUNTEERING: 'volunteering' },
}));
jest.mock('../concepts/concepts.service.js', () => ({ ConceptsService: class {} }));
jest.mock('../entities/bullets/bullets.service.js', () => ({ BulletsService: class {} }));
jest.mock('../entities/resumes/resumes.service.js', () => ({ ResumesService: class {} }));
jest.mock('../queue/embeddings/embedding.service.js', () => ({ EmbeddingService: class {} }));
jest.mock('./advanced-search.graphql.js', () => ({
	AdvancedSearchResultType: {
		SUMMARY: 'SUMMARY',
		SKILL: 'SKILL',
		PROJECT: 'PROJECT',
		WORK_HISTORY: 'WORK_HISTORY',
		VOLUNTEERING: 'VOLUNTEERING',
		FACT: 'FACT',
		BULLET: 'BULLET',
		CONCEPT: 'CONCEPT',
		PROFESSIONAL_STATEMENT: 'PROFESSIONAL_STATEMENT',
	},
}));

describe('AdvancedSearchService', () => {
	const uid = 'auth0|owner';
	const resumes = { search: jest.fn() };
	const bullets = { search: jest.fn() };
	const concepts = { findSimilarConcepts: jest.fn() };
	const embedding = { embed: jest.fn() };
	let service: AdvancedSearchService;

	beforeEach(() => {
		jest.clearAllMocks();
		resumes.search.mockResolvedValue([]);
		bullets.search.mockResolvedValue([]);
		concepts.findSimilarConcepts.mockResolvedValue([]);
		embedding.embed.mockResolvedValue([0.1, 0.2]);
		service = new AdvancedSearchService(
			resumes as unknown as ResumesService,
			bullets as unknown as BulletsService,
			concepts as unknown as ConceptsService,
			embedding as unknown as EmbeddingService,
		);
	});

	it('runs only the searches needed by the requested result types', async () => {
		await service.search(uid, 'devops', [
			AdvancedSearchResultType.SUMMARY,
			AdvancedSearchResultType.FACT,
		]);

		expect(resumes.search).toHaveBeenCalledWith(uid, 'devops', 50, true);
		expect(bullets.search).not.toHaveBeenCalled();
		expect(embedding.embed).toHaveBeenCalledWith('devops');
		expect(concepts.findSimilarConcepts).toHaveBeenCalledWith(
			uid,
			[0.1, 0.2],
			undefined,
			50,
			0.45,
		);
	});

	it('filters bullet matches to requested source-backed result types', async () => {
		bullets.search.mockResolvedValue([
			{
				score: 0.9,
				bullet: { id: 'job-bullet', sourceType: BulletSourceType.JOB },
			},
			{
				score: 0.8,
				bullet: { id: 'project-bullet', sourceType: BulletSourceType.PROJECT },
			},
		]);

		const result = await service.search(uid, 'delivery', [
			AdvancedSearchResultType.WORK_HISTORY,
		]);

		expect(result.bullets.map(({ bullet }) => bullet.id)).toEqual(['job-bullet']);
		expect(resumes.search).not.toHaveBeenCalled();
		expect(embedding.embed).not.toHaveBeenCalled();
	});

	it('returns every bullet source when the bullet result type is requested', async () => {
		bullets.search.mockResolvedValue([
			{
				score: 0.9,
				bullet: { id: 'job-bullet', sourceType: BulletSourceType.JOB },
			},
			{
				score: 0.8,
				bullet: { id: 'project-bullet', sourceType: BulletSourceType.PROJECT },
			},
		]);

		const result = await service.search(uid, 'delivery', [AdvancedSearchResultType.BULLET]);

		expect(result.bullets).toHaveLength(2);
	});
});
