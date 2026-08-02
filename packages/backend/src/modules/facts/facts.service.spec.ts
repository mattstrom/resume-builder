import type { PrismaService } from '../prisma';
import type { EmbeddingService } from './embedding.service';
import {
	ConceptVocabulary,
	type FactMeaningDto,
	FactRelation,
	FactsService,
} from './facts.service';

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
			findMany: jest.fn(),
		},
		concept: {
			findMany: jest.fn(),
			upsert: jest.fn(),
		},
		factConcept: {
			create: jest.fn(),
			count: jest.fn(),
			deleteMany: jest.fn(),
			upsert: jest.fn(),
		},
		$queryRawUnsafe: jest.fn(),
		$executeRaw: jest.fn(),
		$executeRawUnsafe: jest.fn(),
		$transaction: jest.fn(),
	};
	const embedding = { embed: jest.fn() };

	let service: FactsService;

	function meaning(
		relation: FactRelation,
		vocabulary: ConceptVocabulary,
		key: string,
		label = key,
	): FactMeaningDto {
		return {
			relation,
			concept: { vocabulary, key, label },
			source: 'extractor',
			confidence: 1,
		};
	}

	function requiredMeanings(...additional: FactMeaningDto[]): FactMeaningDto[] {
		return [
			meaning(FactRelation.IsA, ConceptVocabulary.FactType, 'achievement', 'Achievement'),
			meaning(
				FactRelation.RelatesTo,
				ConceptVocabulary.Entity,
				'project:resume-builder',
				'Resume Builder',
			),
			...additional,
		];
	}

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
		prisma.fact.findMany.mockResolvedValue([]);
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
		prisma.factConcept.count.mockResolvedValue(1);
		prisma.$queryRawUnsafe.mockResolvedValue([]);
		prisma.factConcept.deleteMany.mockImplementation(async () => {
			links.length = 0;
			return { count: 0 };
		});
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

	it('stores evidence and explicit semantic meanings atomically', async () => {
		await service.create(uid, {
			what: 'Built the fact graph',
			meanings: requiredMeanings(
				meaning(
					FactRelation.About,
					ConceptVocabulary.Topic,
					'knowledge graph',
					'Knowledge Graph',
				),
				meaning(FactRelation.Uses, ConceptVocabulary.Technology, 'react.js', 'react.js'),
			),
		});

		expect(prisma.fact.create.mock.calls[0][0].data).toEqual({
			uid,
			what: 'Built the fact graph',
			impact: undefined,
			scale: undefined,
			citation: undefined,
			citationNodeIndex: undefined,
		});
		expect(links.map((link) => link.relation)).toEqual(['is-a', 'relates-to', 'about', 'uses']);
		expect(conceptKeys('topic')).toEqual(['knowledge-graph']);
		expect(conceptKeys('technology')).toEqual(['React']);
	});

	it('normalizes recognized technology concepts without changing assertion provenance', async () => {
		await service.create(uid, {
			what: 'Built the web client',
			meanings: requiredMeanings(
				meaning(FactRelation.Uses, ConceptVocabulary.Technology, 'react.js', 'react.js'),
				meaning(FactRelation.Uses, ConceptVocabulary.Technology, 'k8s', 'k8s'),
			),
		});

		expect(conceptKeys('technology')).toEqual(['React', 'Kubernetes']);
		expect(links.filter((link) => link.relation === 'uses')).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ source: 'extractor', confidence: 1 }),
			]),
		);
	});

	it('keeps unrecognized technology concepts', async () => {
		await service.create(uid, {
			what: 'Used an internal tool',
			meanings: requiredMeanings(
				meaning(FactRelation.Uses, ConceptVocabulary.Technology, 'Blorptron 9000'),
			),
		});

		expect(conceptKeys('technology')).toEqual(['Blorptron 9000']);
	});

	it('deduplicates equivalent meanings after normalization', async () => {
		await service.create(uid, {
			what: 'Built the web client',
			meanings: requiredMeanings(
				meaning(FactRelation.Uses, ConceptVocabulary.Technology, 'React', 'React'),
				meaning(FactRelation.Uses, ConceptVocabulary.Technology, 'react.js', 'react.js'),
			),
		});

		expect(conceptKeys('technology')).toEqual(['React']);
		expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(3);
	});

	it('locks shared concept keys before upserting them', async () => {
		await service.create(uid, {
			what: 'Built the web client',
			meanings: requiredMeanings(
				meaning(FactRelation.Uses, ConceptVocabulary.Technology, 'react.js', 'react.js'),
			),
		});

		expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(3);
		expect(prisma.$queryRawUnsafe.mock.invocationCallOrder.at(-1)).toBeLessThan(
			prisma.concept.upsert.mock.invocationCallOrder[0],
		);
	});

	it('rejects invalid relation and vocabulary pairs', async () => {
		await expect(
			service.create(uid, {
				what: 'Invalid fact',
				meanings: requiredMeanings(
					meaning(FactRelation.Uses, ConceptVocabulary.Topic, 'react', 'React'),
				),
			}),
		).rejects.toThrow('uses relationships must target the technology vocabulary');
	});

	it('requires one type and at least one related entity', async () => {
		await expect(
			service.create(uid, {
				what: 'Untyped fact',
				meanings: [
					meaning(
						FactRelation.About,
						ConceptVocabulary.Topic,
						'architecture',
						'Architecture',
					),
				],
			}),
		).rejects.toThrow('exactly one is-a');
	});

	it('replaces the complete meaning set when meanings are updated', async () => {
		await service.update(uid, 'fact-1', {
			meanings: requiredMeanings(
				meaning(FactRelation.Uses, ConceptVocabulary.Technology, 'k8s', 'Kubernetes'),
			),
		});

		expect(prisma.factConcept.deleteMany).toHaveBeenCalledWith({ where: { factId: 'fact-1' } });
		expect(conceptKeys('technology')).toEqual(['Kubernetes']);
		expect(prisma.fact.update.mock.calls[0][0].data).toEqual({});
	});

	it('leaves meanings unchanged on an evidence-only update', async () => {
		await service.update(uid, 'fact-1', { what: 'Revised evidence' });

		expect(prisma.factConcept.deleteMany).not.toHaveBeenCalled();
		expect(prisma.fact.update.mock.calls[0][0].data).toEqual({ what: 'Revised evidence' });
	});

	it('embeds semantic relationship labels with the evidence', async () => {
		await service.create(uid, {
			what: 'Built the web client',
			meanings: requiredMeanings(
				meaning(FactRelation.Uses, ConceptVocabulary.Technology, 'react.js', 'react.js'),
			),
		});

		expect(embedding.embed).toHaveBeenCalledWith(expect.stringContaining('uses: React'));
	});

	it('normalizes meanings added individually through the editor', async () => {
		prisma.factConcept.upsert.mockResolvedValue({ id: 'link-1' });

		await service.upsertFactConcept(
			uid,
			'fact-1',
			meaning(FactRelation.Uses, ConceptVocabulary.Technology, 'react.js', 'react.js'),
		);

		expect(prisma.concept.upsert).toHaveBeenCalledWith({
			where: { vocabulary_key: { vocabulary: 'technology', key: 'React' } },
			create: { vocabulary: 'technology', key: 'React', label: 'React' },
			update: { label: 'React' },
		});
	});

	it('does not allow the last required meaning to be removed', async () => {
		await expect(
			service.deleteFactConcept(uid, 'fact-1', 'concept-1', FactRelation.IsA),
		).rejects.toThrow('must retain at least one is-a meaning');

		expect(prisma.factConcept.deleteMany).not.toHaveBeenCalled();
	});

	it('filters through the native semantic relationship shape', async () => {
		await service.findAll(uid, {
			relation: FactRelation.Demonstrates,
			vocabulary: ConceptVocabulary.Capability,
			conceptKey: 'mentoring',
		});

		expect(prisma.fact.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					uid,
					concepts: {
						some: {
							relation: 'demonstrates',
							concept: { vocabulary: 'capability', key: 'mentoring' },
						},
					},
				},
			}),
		);
	});

	it('suggests canonical technologies for the uses relationship', async () => {
		const suggestions = await service.findConceptSuggestions(uid, 'technology', 'react', 5);

		expect(suggestions[0]).toEqual(
			expect.objectContaining({ vocabulary: 'technology', key: 'React', label: 'React' }),
		);
		expect(prisma.concept.findMany).not.toHaveBeenCalled();
	});
});
