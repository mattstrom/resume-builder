import type { PrismaService } from '../../prisma/index.js';
import { EMBEDDING_MODEL, EMBEDDING_PROFILES } from './embedding.constants.js';
import { EmbeddingDocumentsService } from './embedding-documents.service.js';

jest.mock('../../prisma/index.js', () => ({ PrismaService: class {} }));

describe('EmbeddingDocumentsService', () => {
	const prisma = {
		$executeRawUnsafe: jest.fn(),
		$queryRawUnsafe: jest.fn(),
		fact: { findUnique: jest.fn() },
		jobRequirementFact: { findUnique: jest.fn() },
		bullet: { findUnique: jest.fn() },
		concept: { findUnique: jest.fn() },
	};
	let service: EmbeddingDocumentsService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new EmbeddingDocumentsService(prisma as unknown as PrismaService);
	});

	it('loads canonical source data at processing time', async () => {
		prisma.bullet.findUnique.mockResolvedValue({
			id: 'bullet-1',
			text: 'Improved reliability',
			embeddingRevision: 3,
			concepts: [
				{ relation: 'uses', concept: { label: 'Kubernetes' } },
			],
		});

		await expect(service.loadDocument('bullet-1', 'bullet')).resolves.toEqual({
			entityType: 'bullet',
			entityId: 'bullet-1',
			revision: 3,
			profile: EMBEDDING_PROFILES.bullet,
			text: 'Improved reliability\ntechnologies: Kubernetes',
		});
	});

	it('writes a vector only when the semantic revision still matches', async () => {
		prisma.$executeRawUnsafe.mockResolvedValue(1);

		await expect(
			service.saveIfCurrent(
				'fact-1',
				7,
				EMBEDDING_PROFILES.fact,
				EMBEDDING_MODEL,
				[0.1, 0.2],
				'fact',
			),
		).resolves.toBe(true);

		expect(prisma.$executeRawUnsafe.mock.calls[0][0]).toContain(
			'WHERE id = $5 AND "embeddingRevision" = $2',
		);
		expect(prisma.$executeRawUnsafe.mock.calls[0].slice(1)).toEqual([
			'[0.1,0.2]',
			7,
			EMBEDDING_MODEL,
			EMBEDDING_PROFILES.fact,
			'fact-1',
		]);
	});

	it('finds null, outdated, wrong-model, and wrong-profile vectors for repair', async () => {
		prisma.$queryRawUnsafe.mockResolvedValue([
			{ id: 'concept-1', embeddingRevision: 4 },
		]);

		await expect(service.findStaleTargets('concept', 25)).resolves.toEqual([
			{
				entityType: 'concept',
				entityId: 'concept-1',
				revision: 4,
				profile: EMBEDDING_PROFILES.concept,
			},
		]);
		const sql = prisma.$queryRawUnsafe.mock.calls[0][0] as string;
		expect(sql).toContain('embedding IS NULL');
		expect(sql).toContain('"embeddedRevision" IS DISTINCT FROM "embeddingRevision"');
		expect(sql).toContain('"embeddingModel" IS DISTINCT FROM $1');
		expect(sql).toContain('"embeddingProfile" IS DISTINCT FROM $2');
	});
});
