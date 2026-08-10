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
		conceptAlias: { findMany: jest.fn(), upsert: jest.fn() },
		conceptRelation: { findMany: jest.fn(), upsert: jest.fn() },
		$queryRawUnsafe: jest.fn(),
	};
	const embeddingQueue = { enqueue: jest.fn(), enqueueMany: jest.fn() };

	let service: ConceptsService;

	beforeEach(() => {
		jest.clearAllMocks();
		prisma.conceptAlias.findMany.mockResolvedValue([]);
		prisma.conceptRelation.findMany.mockResolvedValue([]);
		prisma.concept.findMany.mockResolvedValue([]);
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

	describe('resolveLabels', () => {
		it('canonicalizes shorthand and punctuation the lexicon knows', async () => {
			const { resolved, unresolved } = await service.resolveLabels(['k8s', 'React.js']);

			expect(resolved).toEqual([
				{
					label: 'k8s',
					concept: {
						vocabulary: 'technology',
						key: 'Kubernetes',
						label: 'Kubernetes',
					},
				},
				{
					label: 'React.js',
					concept: {
						vocabulary: 'technology',
						key: 'React',
						label: 'React',
					},
				},
			]);
			expect(unresolved).toEqual([]);
		});

		it('reports labels no authority recognizes instead of minting concepts', async () => {
			const { resolved, unresolved } = await service.resolveLabels(['Frobnicator 9000']);

			expect(resolved).toEqual([]);
			expect(unresolved).toEqual(['Frobnicator 9000']);
			expect(prisma.concept.upsert).not.toHaveBeenCalled();
		});

		it('collapses spellings that fold together into one lookup', async () => {
			const { resolved } = await service.resolveLabels(['Node.js', 'NodeJS', 'node-js']);

			expect(resolved).toHaveLength(1);
			expect(resolved[0].concept.key).toBe('Node.js');
		});

		it('falls back to a learned alias before giving up on a label', async () => {
			prisma.conceptAlias.findMany.mockResolvedValue([
				{
					normalizedLabel: 'ourinternaltool',
					concept: {
						vocabulary: 'capability',
						key: 'deployment-tooling',
						label: 'Deployment Tooling',
					},
				},
			]);

			const { resolved, unresolved } = await service.resolveLabels(['Our Internal Tool']);

			expect(unresolved).toEqual([]);
			expect(resolved[0].concept).toEqual({
				vocabulary: 'capability',
				key: 'deployment-tooling',
				label: 'Deployment Tooling',
			});
		});
	});

	describe('ontologyAncestors', () => {
		it('walks a technology up to its category and authored bucket', () => {
			const ancestors = service.ontologyAncestors({
				vocabulary: 'technology',
				key: 'React',
				label: 'React',
			});

			expect(ancestors.length).toBeGreaterThan(0);
			expect(ancestors.every(({ vocabulary }) => vocabulary === 'technology-category')).toBe(
				true,
			);
		});

		it('returns nothing for vocabularies with no authored hierarchy', () => {
			expect(
				service.ontologyAncestors({
					vocabulary: 'capability',
					key: 'mentoring',
					label: 'Mentoring',
				}),
			).toEqual([]);
		});
	});

	describe('recordAlias', () => {
		const concept = { id: 'concept-1', label: 'Kubernetes' } as never;

		it('stores a differing spelling under its folded form', async () => {
			await service.recordAlias(prisma as never, concept, 'k8s');

			expect(prisma.conceptAlias.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					create: {
						conceptId: 'concept-1',
						label: 'k8s',
						normalizedLabel: 'k8s',
					},
				}),
			);
		});

		it('skips a restatement of the canonical label', async () => {
			await service.recordAlias(prisma as never, concept, 'kubernetes');

			expect(prisma.conceptAlias.upsert).not.toHaveBeenCalled();
		});
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
