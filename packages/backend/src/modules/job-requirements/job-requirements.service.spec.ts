import type { PrismaService } from '../prisma/index.js';
import { EMBEDDING_MODEL, EMBEDDING_PROFILES } from '../queue/embeddings/embedding.constants.js';
import type { EmbeddingQueueService } from '../queue/embeddings/embedding-queue.service.js';
import { JobRequirementsService } from './job-requirements.service.js';

jest.mock('../prisma/index.js', () => ({ PrismaService: class {} }));

describe('JobRequirementsService embeddings', () => {
	const prisma = {
		$queryRawUnsafe: jest.fn(),
		jobRequirementFact: {
			create: jest.fn(),
			findUnique: jest.fn(),
			findMany: jest.fn(),
		},
		factConcept: { findMany: jest.fn() },
	};
	const queue = { enqueueMany: jest.fn() };
	let service: JobRequirementsService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new JobRequirementsService(
			prisma as unknown as PrismaService,
			queue as unknown as EmbeddingQueueService,
		);
		prisma.jobRequirementFact.create.mockImplementation(async ({ data }) => ({
			id: 'requirement-1',
			...data,
			embeddingRevision: 1,
		}));
		queue.enqueueMany.mockResolvedValue(undefined);
	});

	it('returns immediately after enqueueing persisted requirements', async () => {
		const created = await service.create('user-1', 'application-1', [
			{
				kind: 'required',
				what: 'Operate distributed systems',
				technologies: ['Kubernetes'],
			},
		]);

		expect(created).toHaveLength(1);
		expect(queue.enqueueMany).toHaveBeenCalledWith([
			{
				entityType: 'job-requirement',
				entityId: 'requirement-1',
				revision: 1,
				profile: EMBEDDING_PROFILES['job-requirement'],
			},
		]);
	});

	it('only matches fresh requirement and fact vectors', async () => {
		prisma.$queryRawUnsafe
			.mockResolvedValueOnce([{ embedding: '[0.1,0.2]' }])
			.mockResolvedValueOnce([]);
		prisma.factConcept.findMany.mockResolvedValue([]);

		await service.findSimilarToRequirement('requirement-1', 'user-1');

		const requirementSql = prisma.$queryRawUnsafe.mock.calls[0][0] as string;
		expect(requirementSql).toContain('"embeddedRevision" = "embeddingRevision"');
		expect(prisma.$queryRawUnsafe.mock.calls[0].slice(1)).toEqual([
			'requirement-1',
			EMBEDDING_MODEL,
			EMBEDDING_PROFILES['job-requirement'],
		]);

		const factSql = prisma.$queryRawUnsafe.mock.calls[1][0] as string;
		expect(factSql).toContain('"embeddingProfile" = $5');
		expect(prisma.$queryRawUnsafe.mock.calls[1].slice(-2)).toEqual([
			EMBEDDING_MODEL,
			EMBEDDING_PROFILES.fact,
		]);
	});
});
