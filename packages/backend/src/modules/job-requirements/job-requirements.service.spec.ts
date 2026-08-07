import type { ConceptsService } from '../concepts/concepts.service.js';
import type { PrismaService } from '../prisma/index.js';
import type { EmbeddingQueueService } from '../queue/embeddings/embedding-queue.service.js';
import { EMBEDDING_MODEL, EMBEDDING_PROFILES } from '../queue/embeddings/embedding.constants.js';
import { JobRequirementsService } from './job-requirements.service.js';

jest.mock('../prisma/index.js', () => ({ PrismaService: class {} }));

describe('JobRequirementsService embeddings', () => {
	const prisma = {
		$queryRawUnsafe: jest.fn(),
		$transaction: jest.fn(),
		jobRequirementFact: {
			create: jest.fn(),
			deleteMany: jest.fn(),
			findUnique: jest.fn(),
			findUniqueOrThrow: jest.fn(),
			findMany: jest.fn(),
		},
		jobRequirementConcept: { create: jest.fn() },
		factConcept: { findMany: jest.fn() },
	};
	const queue = { enqueueMany: jest.fn() };
	const concepts = {
		lockConcepts: jest.fn(),
		upsertConcept: jest.fn(),
		enqueueConcepts: jest.fn(),
	};
	let service: JobRequirementsService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new JobRequirementsService(
			prisma as unknown as PrismaService,
			queue as unknown as EmbeddingQueueService,
			concepts as unknown as ConceptsService,
		);
		prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
		prisma.jobRequirementFact.create.mockImplementation(async ({ data }) => ({
			id: 'requirement-1',
			...data,
			embeddingRevision: 1,
		}));
		prisma.jobRequirementFact.findUniqueOrThrow.mockResolvedValue({
			id: 'requirement-1',
			embeddingRevision: 1,
			concepts: [],
		});
		concepts.upsertConcept.mockResolvedValue({
			id: 'concept-1',
			embeddingRevision: 1,
		});
		queue.enqueueMany.mockResolvedValue(undefined);
		concepts.enqueueConcepts.mockResolvedValue(undefined);
	});

	it('replaces stale requirements before creating the latest identification', async () => {
		prisma.jobRequirementFact.deleteMany.mockResolvedValue({ count: 2 });

		await service.replace('user-1', 'application-1', [
			{ kind: 'required', what: 'Build reliable services' },
		]);

		expect(prisma.jobRequirementFact.deleteMany).toHaveBeenCalledWith({
			where: { uid: 'user-1', applicationId: 'application-1' },
		});
		expect(prisma.jobRequirementFact.create).toHaveBeenCalledTimes(1);
	});

	it('stores quantitative degree as a qualifier on the concept assertion', async () => {
		await service.create('user-1', 'application-1', [
			{
				kind: 'required',
				what: '10+ years of TypeScript experience',
				meanings: [
					{
						relation: 'requires',
						concept: {
							vocabulary: 'technology',
							key: 'TypeScript',
							label: 'TypeScript',
						},
						qualifier: {
							dimension: 'experience',
							operator: 'gte',
							value: 120,
							unit: 'months',
						},
					},
				],
			},
		]);

		expect(prisma.jobRequirementConcept.create).toHaveBeenCalledWith({
			data: {
				jobRequirementId: 'requirement-1',
				conceptId: 'concept-1',
				relation: 'requires',
				source: 'classifier',
				confidence: null,
				qualifier: {
					dimension: 'experience',
					operator: 'gte',
					value: 120,
					unit: 'months',
				},
			},
		});
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
		expect(factSql).toContain('$1::resume_builder.vector');
		expect(factSql).toContain('OPERATOR(resume_builder.<=>)');
		expect(factSql).toContain('"embeddingProfile" = $5');
		expect(prisma.$queryRawUnsafe.mock.calls[1].slice(-2)).toEqual([
			EMBEDDING_MODEL,
			EMBEDDING_PROFILES.fact,
		]);
	});
});
