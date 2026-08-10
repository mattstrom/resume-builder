import type { ConceptsService } from '../../concepts/concepts.service';
import type { PrismaService } from '../../prisma';
import { ProjectsService } from './projects.service';

jest.mock('../../prisma/index.js', () => ({ PrismaService: class {} }));
jest.mock('../../concepts/concepts.service.js', () => ({
	ConceptsService: class {},
}));

describe('ProjectsService', () => {
	const uid = 'auth0|test';
	const tx = {
		project: { create: jest.fn(), update: jest.fn() },
		projectConcept: { deleteMany: jest.fn(), create: jest.fn() },
	};
	const prisma = {
		project: { findFirst: jest.fn() },
		$transaction: jest.fn((run: (client: typeof tx) => unknown) => run(tx)),
	};
	const conceptsService = { materializeLabels: jest.fn() };

	let service: ProjectsService;

	beforeEach(() => {
		jest.clearAllMocks();
		conceptsService.materializeLabels.mockResolvedValue({
			concepts: [],
			unresolved: [],
		});
		service = new ProjectsService(
			prisma as unknown as PrismaService,
			conceptsService as unknown as ConceptsService,
		);
	});

	it('links every technology the ontology resolves', async () => {
		tx.project.create.mockResolvedValue({
			id: 'project-1',
			technologies: ['k8s', 'Frobnicator 9000'],
		});
		conceptsService.materializeLabels.mockResolvedValue({
			concepts: [{ id: 'concept-kubernetes' }],
			unresolved: ['Frobnicator 9000'],
		});

		await service.create(uid, {
			name: 'Platform',
			technologies: ['k8s', 'Frobnicator 9000'],
		} as never);

		expect(conceptsService.materializeLabels).toHaveBeenCalledWith(tx, [
			'k8s',
			'Frobnicator 9000',
		]);
		expect(tx.projectConcept.create).toHaveBeenCalledTimes(1);
		expect(tx.projectConcept.create).toHaveBeenCalledWith({
			data: {
				projectId: 'project-1',
				conceptId: 'concept-kubernetes',
				relation: 'uses',
			},
		});
	});

	it('drops the edge for a technology removed from the list', async () => {
		prisma.project.findFirst.mockResolvedValue({ id: 'project-1' });
		tx.project.update.mockResolvedValue({
			id: 'project-1',
			technologies: [],
		});

		await service.update(uid, 'project-1', { technologies: [] } as never);

		expect(tx.projectConcept.deleteMany).toHaveBeenCalledWith({
			where: { projectId: 'project-1' },
		});
		expect(tx.projectConcept.create).not.toHaveBeenCalled();
	});
});
