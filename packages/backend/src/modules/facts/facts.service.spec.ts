import type { PrismaService } from '../prisma';
import type { EmbeddingService } from './embedding.service';
import { FactsService } from './facts.service';

jest.mock('../prisma/index.js', () => ({ PrismaService: class {} }));
jest.mock('./embedding.service.js', () => ({ EmbeddingService: class {} }));

describe('FactsService technology normalization', () => {
	const uid = 'auth0|test';

	const prisma = {
		fact: {
			create: jest.fn(),
			update: jest.fn(),
			findFirst: jest.fn(),
		},
		concept: {
			findMany: jest.fn(),
			upsert: jest.fn(),
		},
		factConcept: {
			create: jest.fn(),
			deleteMany: jest.fn(),
			upsert: jest.fn(),
		},
		$executeRaw: jest.fn(),
		$executeRawUnsafe: jest.fn(),
		$transaction: jest.fn(),
	};
	const embedding = { embed: jest.fn() };

	let service: FactsService;

	/** The `technologies` array the service actually handed to Prisma. */
	function writtenTechnologies(call: {
		data: { technologies?: string[] };
	}): string[] | undefined {
		return call.data.technologies;
	}

	beforeEach(() => {
		jest.clearAllMocks();

		prisma.fact.create.mockImplementation(
			async ({ data }: { data: Record<string, unknown> }) => ({
				id: 'fact-1',
				...data,
			}),
		);
		prisma.fact.update.mockImplementation(
			async ({ data }: { data: Record<string, unknown> }) => ({
				id: 'fact-1',
				what: 'unchanged',
				tags: [],
				technologies: [],
				...data,
			}),
		);
		prisma.fact.findFirst.mockResolvedValue({ id: 'fact-1', uid });
		prisma.concept.upsert.mockImplementation(
			async ({ create }: { create: { key: string } }) => ({
				id: `concept:${create.key}`,
				...create,
			}),
		);
		prisma.$transaction.mockImplementation(
			async (operation: (client: typeof prisma) => Promise<unknown>) => operation(prisma),
		);
		embedding.embed.mockResolvedValue([0.1, 0.2]);

		service = new FactsService(
			prisma as unknown as PrismaService,
			embedding as unknown as EmbeddingService,
		);

		// setEmbedding writes through raw SQL; stub it out so these tests stay
		// focused on what lands in the technologies column.
		jest.spyOn(service, 'setEmbedding').mockResolvedValue(undefined);
	});

	it('collapses spelling variants onto canonical names', async () => {
		await service.create(uid, {
			kind: 'skill',
			what: 'Built the web client',
			technologies: ['react.js', 'k8s', 'postgres'],
		});

		expect(writtenTechnologies(prisma.fact.create.mock.calls[0][0])).toEqual([
			'React',
			'Kubernetes',
			'PostgreSQL',
		]);
	});

	it('keeps unrecognized technologies rather than dropping them', async () => {
		await service.create(uid, {
			kind: 'skill',
			what: 'Used an internal tool',
			technologies: ['Blorptron 9000', 'React'],
		});

		expect(writtenTechnologies(prisma.fact.create.mock.calls[0][0])).toEqual([
			'Blorptron 9000',
			'React',
		]);
	});

	it('deduplicates variants that collapse onto the same name', async () => {
		await service.create(uid, {
			kind: 'skill',
			what: 'Built the web client',
			technologies: ['React', 'react.js', 'ReactJS'],
		});

		expect(writtenTechnologies(prisma.fact.create.mock.calls[0][0])).toEqual(['React']);
	});

	it('handles a fact with no technologies', async () => {
		await service.create(uid, {
			kind: 'trait',
			what: 'Mentors junior engineers',
		});

		expect(writtenTechnologies(prisma.fact.create.mock.calls[0][0])).toEqual([]);
	});

	it('does not touch tags', async () => {
		await service.create(uid, {
			kind: 'skill',
			what: 'Built the web client',
			tags: ['ci/cd', 'distributed-systems'],
			technologies: ['react.js'],
		});

		expect(prisma.fact.create.mock.calls[0][0].data.tags).toEqual([
			'ci/cd',
			'distributed-systems',
		]);
	});

	it('normalizes on update as well', async () => {
		await service.update(uid, 'fact-1', { technologies: ['k8s'] });

		expect(writtenTechnologies(prisma.fact.update.mock.calls[0][0])).toEqual(['Kubernetes']);
	});

	it('leaves the technologies column alone on a partial update', async () => {
		await service.update(uid, 'fact-1', { what: 'Revised wording' });

		expect(writtenTechnologies(prisma.fact.update.mock.calls[0][0])).toBeUndefined();
	});

	it('embeds the canonical names, not the raw input', async () => {
		await service.create(uid, {
			kind: 'skill',
			what: 'Built the web client',
			technologies: ['react.js', 'k8s'],
		});

		expect(embedding.embed).toHaveBeenCalledWith(expect.stringContaining('React, Kubernetes'));
	});

	it('persists normalized technologies as semantic uses relationships', async () => {
		await service.create(uid, {
			kind: 'skill',
			what: 'Built the web client',
			technologies: ['react.js'],
		});

		expect(prisma.concept.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					vocabulary_key: { vocabulary: 'technology', key: 'React' },
				},
			}),
		);
		expect(prisma.factConcept.create).toHaveBeenCalledWith({
			data: {
				factId: 'fact-1',
				conceptId: 'concept:React',
				relation: 'uses',
				source: 'ontology-normalizer',
				confidence: 1,
			},
		});
	});

	it('normalizes technology concepts added through the meaning editor', async () => {
		prisma.factConcept.upsert.mockResolvedValue({ id: 'link-1' });

		await service.upsertFactConcept(uid, 'fact-1', {
			vocabulary: 'technology',
			key: 'react.js',
			label: 'react.js',
			relation: 'uses',
			source: 'user',
		});

		expect(prisma.concept.upsert).toHaveBeenCalledWith({
			where: {
				vocabulary_key: { vocabulary: 'technology', key: 'React' },
			},
			create: { vocabulary: 'technology', key: 'React', label: 'React' },
			update: {},
		});
	});

	it('suggests canonical technologies for the uses relationship', async () => {
		const suggestions = await service.findConceptSuggestions(uid, 'technology', 'react', 5);

		expect(suggestions[0]).toEqual(
			expect.objectContaining({
				vocabulary: 'technology',
				key: 'React',
				label: 'React',
			}),
		);
		expect(prisma.concept.findMany).not.toHaveBeenCalled();
	});

	it('suggests stored concepts from the requested vocabulary', async () => {
		prisma.concept.findMany.mockResolvedValue([
			{
				vocabulary: 'capability',
				key: 'mentoring',
				label: 'Mentoring',
				definition: null,
			},
		]);

		const suggestions = await service.findConceptSuggestions(uid, 'capability', 'ment');

		expect(suggestions).toHaveLength(1);
		expect(prisma.concept.findMany).toHaveBeenCalledWith({
			where: {
				vocabulary: 'capability',
				facts: { some: { fact: { uid } } },
				label: { contains: 'ment', mode: 'insensitive' },
			},
			select: {
				vocabulary: true,
				key: true,
				label: true,
				definition: true,
			},
			orderBy: { label: 'asc' },
			take: 20,
		});
	});
});
