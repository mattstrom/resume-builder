import type { PrismaService } from '../prisma';
import type { EmbeddingQueueService } from '../queue/embeddings/embedding-queue.service';
import { ConceptsService } from './concepts.service';

jest.mock('../prisma/index.js', () => ({ PrismaService: class {} }));
jest.mock('../queue/embeddings/embedding-queue.service.js', () => ({
	EmbeddingQueueService: class {},
}));

describe('ConceptsService', () => {
	const uid = 'auth0|test';
	const prisma = {
		concept: {
			findMany: jest.fn(),
			findUnique: jest.fn(),
			upsert: jest.fn(),
		},
		conceptAlias: { findMany: jest.fn() },
		conceptRelation: { findMany: jest.fn() },
		$queryRawUnsafe: jest.fn(),
	};
	const embeddingQueue = { enqueue: jest.fn(), enqueueMany: jest.fn() };

	let service: ConceptsService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new ConceptsService(
			prisma as unknown as PrismaService,
			embeddingQueue as unknown as EmbeddingQueueService,
		);
	});

	it('casts advisory lock results to a Prisma-supported type', async () => {
		await service.lockConcepts(prisma as never, [
			{ vocabulary: 'technology', key: 'React', label: 'React' },
		]);

		expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
			'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))::text',
			'technology',
			'React',
		);
	});

	it('suggests canonical technologies for the uses relationship', async () => {
		const suggestions = await service.findConceptSuggestions(uid, 'technology', 'react', 5);

		expect(suggestions[0]).toEqual(
			expect.objectContaining({ vocabulary: 'technology', key: 'React', label: 'React' }),
		);
		expect(prisma.concept.findMany).not.toHaveBeenCalled();
	});

	it('searches only fresh concepts used by the current user', async () => {
		const first = {
			id: 'concept-1',
			vocabulary: 'capability',
			key: 'mentoring',
			label: 'Mentoring',
			definition: null,
			externalUri: null,
			embeddingRevision: 1,
			embeddedRevision: 1,
			embeddingModel: 'fastembed/bge-base-en-v1.5',
			embeddingProfile: 'concept-search:v1',
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		prisma.$queryRawUnsafe.mockResolvedValue([{ id: first.id, distance: 0.3 }]);
		prisma.concept.findMany.mockResolvedValue([first]);

		const result = await service.findSimilarConcepts(uid, [0.1, 0.2], undefined, 100);

		const [sql, vector, owner, model, profile, vocabulary, maximumDistance, limit] =
			prisma.$queryRawUnsafe.mock.calls[0];
		expect(sql).toContain('OPERATOR(resume_builder.<=>)');
		expect(sql).toContain('c."embeddedRevision" = c."embeddingRevision"');
		expect(sql).toContain('f.uid = $2');
		expect(sql).toContain('b.uid = $2');
		expect([vector, owner, model, profile, vocabulary, limit]).toEqual([
			'[0.1,0.2]',
			uid,
			'fastembed/bge-base-en-v1.5',
			'concept-search:v1',
			null,
			50,
		]);
		expect(maximumDistance).toBeCloseTo(0.45);
		expect(result).toEqual([{ concept: first, score: 0.7 }]);
	});
});
