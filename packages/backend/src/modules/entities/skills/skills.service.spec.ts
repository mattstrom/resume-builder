import type { ConceptsService } from '../../concepts/concepts.service';
import type { PrismaService } from '../../prisma';
import { SkillsService } from './skills.service';

jest.mock('../../prisma/index.js', () => ({ PrismaService: class {} }));
jest.mock('../../concepts/concepts.service.js', () => ({
	ConceptsService: class {},
}));

describe('SkillsService', () => {
	const uid = 'auth0|test';
	const tx = {
		skill: { create: jest.fn(), update: jest.fn() },
		skillConcept: { deleteMany: jest.fn(), create: jest.fn() },
	};
	const prisma = {
		skill: { findFirst: jest.fn() },
		$transaction: jest.fn((run: (client: typeof tx) => unknown) => run(tx)),
	};
	const conceptsService = { materializeLabels: jest.fn() };

	let service: SkillsService;

	beforeEach(() => {
		jest.clearAllMocks();
		conceptsService.materializeLabels.mockResolvedValue({
			concepts: [],
			unresolved: [],
		});
		service = new SkillsService(
			prisma as unknown as PrismaService,
			conceptsService as unknown as ConceptsService,
		);
	});

	it('links a created skill to the concept its name resolves to', async () => {
		tx.skill.create.mockResolvedValue({ id: 'skill-1', name: 'k8s' });
		conceptsService.materializeLabels.mockResolvedValue({
			concepts: [{ id: 'concept-kubernetes' }],
			unresolved: [],
		});

		await service.create(uid, { name: 'k8s', category: 'Infra' } as never);

		expect(conceptsService.materializeLabels).toHaveBeenCalledWith(tx, ['k8s']);
		expect(tx.skillConcept.create).toHaveBeenCalledWith({
			data: {
				skillId: 'skill-1',
				conceptId: 'concept-kubernetes',
				relation: 'is-a',
			},
		});
	});

	it('replaces edges on rename rather than leaving the old concept attached', async () => {
		prisma.skill.findFirst.mockResolvedValue({ id: 'skill-1' });
		tx.skill.update.mockResolvedValue({ id: 'skill-1', name: 'Rust' });
		conceptsService.materializeLabels.mockResolvedValue({
			concepts: [{ id: 'concept-rust' }],
			unresolved: [],
		});

		await service.update(uid, 'skill-1', { name: 'Rust' } as never);

		expect(tx.skillConcept.deleteMany).toHaveBeenCalledWith({
			where: { skillId: 'skill-1' },
		});
		expect(tx.skillConcept.create).toHaveBeenCalledTimes(1);
		expect(tx.skillConcept.create).toHaveBeenCalledWith({
			data: { skillId: 'skill-1', conceptId: 'concept-rust', relation: 'is-a' },
		});
	});

	it('keeps an unresolvable skill but gives it no edge', async () => {
		tx.skill.create.mockResolvedValue({
			id: 'skill-1',
			name: 'Frobnicator 9000',
		});
		conceptsService.materializeLabels.mockResolvedValue({
			concepts: [],
			unresolved: ['Frobnicator 9000'],
		});

		const created = await service.create(uid, {
			name: 'Frobnicator 9000',
		} as never);

		expect(created.name).toBe('Frobnicator 9000');
		expect(tx.skillConcept.create).not.toHaveBeenCalled();
	});
});
