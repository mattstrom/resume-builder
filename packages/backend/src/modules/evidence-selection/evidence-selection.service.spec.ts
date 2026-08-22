import type { ConceptsService } from '../concepts/concepts.service.js';
import type { BulletsService } from '../entities/bullets/bullets.service.js';
import type { JobRequirementsService } from '../job-requirements/job-requirements.service.js';
import { EvidenceSelectionService } from './evidence-selection.service.js';

jest.mock('../concepts/concepts.service.js', () => ({ ConceptsService: class {} }));
jest.mock('../entities/bullets/bullets.service.js', () => ({ BulletsService: class {} }));
jest.mock('../job-requirements/job-requirements.service.js', () => ({
	JobRequirementsService: class {},
}));

function requirementFact(
	id: string,
	concepts: Array<[conceptId: string, relation: string, label?: string]>,
) {
	return {
		id,
		concepts: concepts.map(([conceptId, relation, label]) => ({
			conceptId,
			relation,
			concept: { label: label ?? conceptId },
		})),
	};
}

function bulletRow(
	id: string,
	conceptIds: string[],
	scores: Partial<{
		contextScore: number;
		actionScore: number;
		outcomeScore: number;
		clarityScore: number;
	}> = {},
) {
	return {
		id,
		text: `bullet ${id}`,
		sourceType: 'job',
		sourceId: 'job-1',
		concepts: conceptIds.map((conceptId) => ({ conceptId })),
		contextScore: null,
		actionScore: null,
		outcomeScore: null,
		clarityScore: null,
		...scores,
	};
}

describe('EvidenceSelectionService', () => {
	const jobRequirements = { findByApplication: jest.fn() };
	const bullets = { findAll: jest.fn() };
	const concepts = { findBroaderClosure: jest.fn() };
	const uid = 'auth0|owner';

	const service = new EvidenceSelectionService(
		jobRequirements as unknown as JobRequirementsService,
		bullets as unknown as BulletsService,
		concepts as unknown as ConceptsService,
	);

	beforeEach(() => {
		jest.clearAllMocks();
		concepts.findBroaderClosure.mockResolvedValue(new Map());
	});

	it('keeps the strongest predicate when requirements repeat a concept', async () => {
		jobRequirements.findByApplication.mockResolvedValue([
			requirementFact('req-1', [['c-k8s', 'prefers', 'Kubernetes']]),
			requirementFact('req-2', [['c-k8s', 'requires', 'Kubernetes']]),
		]);
		bullets.findAll.mockResolvedValue([bulletRow('b1', ['c-k8s'])]);

		const plan = await service.planForApplication(uid, 'app-1');

		expect(plan.selected).toHaveLength(1);
		// weight 1 (requires), not 0.3 (prefers)
		expect(plan.coverage.possible).toBe(1);
	});

	it('traces a concept back to every requirement that asked for it', async () => {
		jobRequirements.findByApplication.mockResolvedValue([
			requirementFact('req-1', [['c-k8s', 'prefers', 'Kubernetes']]),
			requirementFact('req-2', [['c-k8s', 'requires', 'Kubernetes']]),
		]);
		bullets.findAll.mockResolvedValue([]);

		const plan = await service.planForApplication(uid, 'app-1');

		// The gap has to name both JD lines, or there is no way back from a
		// missing concept to the text that demanded it.
		expect(plan.gaps.unevidenced).toEqual([
			expect.objectContaining({
				conceptId: 'c-k8s',
				relation: 'requires',
				requirementIds: ['req-1', 'req-2'],
			}),
		]);
	});

	it('ignores concept edges whose relation is not a job-side predicate', async () => {
		jobRequirements.findByApplication.mockResolvedValue([
			requirementFact('req-1', [
				['c-k8s', 'requires'],
				['c-noise', 'demonstrates'],
			]),
		]);
		bullets.findAll.mockResolvedValue([bulletRow('b1', ['c-noise'])]);

		const plan = await service.planForApplication(uid, 'app-1');

		expect(plan.selected).toEqual([]);
		expect(plan.gaps.unevidenced.map(({ conceptId }) => conceptId)).toEqual([
			'c-k8s',
		]);
	});

	it('covers a requirement through an ancestor of a concept the bullet names', async () => {
		jobRequirements.findByApplication.mockResolvedValue([
			requirementFact('req-1', [['c-cloud', 'requires', 'Cloud Platforms']]),
		]);
		bullets.findAll.mockResolvedValue([bulletRow('b1', ['c-aws'])]);
		concepts.findBroaderClosure.mockResolvedValue(
			new Map([['c-aws', new Set(['c-cloud'])]]),
		);

		const plan = await service.planForApplication(uid, 'app-1');

		expect(concepts.findBroaderClosure).toHaveBeenCalledWith(['c-aws']);
		expect(plan.selected[0]?.marginalGain).toBe(0.5);
		expect(plan.gaps.crowdedOut).toEqual([]);
	});

	it('does not resolve ancestors when the application has no requirements', async () => {
		jobRequirements.findByApplication.mockResolvedValue([]);
		bullets.findAll.mockResolvedValue([bulletRow('b1', ['c-k8s'])]);

		const plan = await service.planForApplication(uid, 'app-1');

		expect(concepts.findBroaderClosure).not.toHaveBeenCalled();
		expect(plan.selected).toEqual([]);
	});

	it('breaks ties with the mean of whichever rubric dimensions are scored', async () => {
		jobRequirements.findByApplication.mockResolvedValue([
			requirementFact('req-1', [['c-k8s', 'requires']]),
		]);
		bullets.findAll.mockResolvedValue([
			bulletRow('b1', ['c-k8s'], { contextScore: 2, actionScore: 2 }),
			bulletRow('b2', ['c-k8s'], { contextScore: 5 }),
		]);

		const plan = await service.planForApplication(uid, 'app-1');

		expect(plan.selected.map(({ id }) => id)).toEqual(['b2']);
	});

	it('excludes archived bullets by default and honours an explicit status', async () => {
		jobRequirements.findByApplication.mockResolvedValue([]);
		bullets.findAll.mockResolvedValue([]);

		await service.planForApplication(uid, 'app-1');
		expect(bullets.findAll).toHaveBeenCalledWith(uid, {});

		await service.planForApplication(uid, 'app-1', 5, 'ready' as never);
		expect(bullets.findAll).toHaveBeenCalledWith(uid, { status: 'ready' });
	});
});
