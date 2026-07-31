import type { PrismaService } from '../prisma';
import type { EmbeddingService } from './embedding.service';
import { FactsService } from './facts.service';

jest.mock('../prisma/index.js', () => ({ PrismaService: class {} }));
jest.mock('./embedding.service.js', () => ({ EmbeddingService: class {} }));

describe('FactsService semantic persistence', () => {
	const uid = 'auth0|test';
	const concepts = new Map<
		string,
		{ id: string; vocabulary: string; key: string; label: string }
	>();
	const links: Array<{
		factId: string;
		conceptId: string;
		relation: string;
		source: string;
		confidence: number | null;
	}> = [];
	let factData: Record<string, unknown> = {};

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

	function conceptKeys(vocabulary: string): string[] {
		return prisma.concept.upsert.mock.calls
			.map(([input]) => input.create as { vocabulary: string; key: string })
			.filter((concept) => concept.vocabulary === vocabulary)
			.map((concept) => concept.key);
	}

	beforeEach(() => {
		jest.clearAllMocks();
		concepts.clear();
		links.length = 0;
		factData = {
			id: 'fact-1',
			uid,
			what: 'unchanged',
			impact: null,
			scale: null,
			citation: null,
			citationNodeIndex: null,
			createdAt: new Date('2026-07-31T00:00:00Z'),
		};

		prisma.fact.create.mockImplementation(
			async ({ data }: { data: Record<string, unknown> }) => {
				factData = { ...factData, ...data };
				return factData;
			},
		);
		prisma.fact.update.mockImplementation(
			async ({ data }: { data: Record<string, unknown> }) => {
				factData = { ...factData, ...data };
				return factData;
			},
		);
		prisma.fact.findFirst.mockImplementation(async () => ({
			...factData,
			concepts: links.map((link) => ({
				...link,
				concept: concepts.get(link.conceptId),
			})),
		}));
		prisma.concept.upsert.mockImplementation(
			async ({ create }: { create: { vocabulary: string; key: string; label: string } }) => {
				const id = `concept:${create.vocabulary}:${create.key}`;
				const concept = { id, ...create };
				concepts.set(id, concept);
				return concept;
			},
		);
		prisma.factConcept.create.mockImplementation(
			async ({ data }: { data: (typeof links)[number] }) => {
				links.push(data);
				return data;
			},
		);
		prisma.factConcept.deleteMany.mockImplementation(
			async ({ where }: { where: { relation: string; concept: { vocabulary: string } } }) => {
				for (let index = links.length - 1; index >= 0; index -= 1) {
					const concept = concepts.get(links[index].conceptId);
					if (
						links[index].relation === where.relation &&
						concept?.vocabulary === where.concept.vocabulary
					) {
						links.splice(index, 1);
					}
				}
				return { count: 0 };
			},
		);
		prisma.$transaction.mockImplementation(
			async (operation: (client: typeof prisma) => Promise<unknown>) => operation(prisma),
		);
		embedding.embed.mockResolvedValue([0.1, 0.2]);

		service = new FactsService(
			prisma as unknown as PrismaService,
			embedding as unknown as EmbeddingService,
		);
		jest.spyOn(service, 'setEmbedding').mockResolvedValue(undefined);
	});

	it('stores classification only as concept relationships', async () => {
		await service.create(uid, {
			kind: 'achievement',
			entityType: 'project',
			entityId: 'resume-builder',
			what: 'Built the fact graph',
			tags: ['knowledge-graph'],
			technologies: ['react.js'],
		});

		expect(prisma.fact.create.mock.calls[0][0].data).toEqual({
			uid,
			what: 'Built the fact graph',
			impact: undefined,
			scale: undefined,
			citation: undefined,
			citationNodeIndex: undefined,
		});
		expect(links.map((link) => link.relation)).toEqual(['is-a', 'about', 'uses', 'relates-to']);
		expect(conceptKeys('fact-type')).toEqual(['achievement']);
		expect(conceptKeys('topic')).toEqual(['knowledge-graph']);
		expect(conceptKeys('entity')).toEqual(['project:resume-builder']);
	});

	it('collapses technology spellings onto canonical concept keys', async () => {
		await service.create(uid, {
			kind: 'skill',
			what: 'Built the web client',
			technologies: ['react.js', 'k8s', 'postgres'],
		});

		expect(conceptKeys('technology')).toEqual(['React', 'Kubernetes', 'PostgreSQL']);
	});

	it('keeps unrecognized technologies rather than dropping them', async () => {
		await service.create(uid, {
			kind: 'skill',
			what: 'Used an internal tool',
			technologies: ['Blorptron 9000', 'React'],
		});

		expect(conceptKeys('technology')).toEqual(['Blorptron 9000', 'React']);
	});

	it('deduplicates variants that collapse onto the same concept', async () => {
		await service.create(uid, {
			kind: 'skill',
			what: 'Built the web client',
			technologies: ['React', 'react.js', 'ReactJS'],
		});

		expect(conceptKeys('technology')).toEqual(['React']);
	});

	it('replaces semantic technology relationships on update', async () => {
		await service.update(uid, 'fact-1', { technologies: ['k8s'] });

		expect(conceptKeys('technology')).toEqual(['Kubernetes']);
		expect(prisma.fact.update.mock.calls[0][0].data).toEqual({});
	});

	it('leaves semantic relationships alone on a prose-only update', async () => {
		await service.update(uid, 'fact-1', { what: 'Revised wording' });

		expect(prisma.factConcept.deleteMany).not.toHaveBeenCalled();
		expect(prisma.fact.update.mock.calls[0][0].data).toEqual({
			what: 'Revised wording',
		});
	});

	it('embeds relationship labels with the evidence text', async () => {
		await service.create(uid, {
			kind: 'skill',
			what: 'Built the web client',
			technologies: ['react.js', 'k8s'],
		});

		expect(embedding.embed).toHaveBeenCalledWith(expect.stringContaining('uses: React'));
		expect(embedding.embed).toHaveBeenCalledWith(expect.stringContaining('uses: Kubernetes'));
	});

	it('records ontology provenance for recognized technologies', async () => {
		await service.create(uid, {
			kind: 'skill',
			what: 'Built the web client',
			technologies: ['react.js'],
		});

		expect(prisma.factConcept.create).toHaveBeenCalledWith({
			data: {
				factId: 'fact-1',
				conceptId: 'concept:technology:React',
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
