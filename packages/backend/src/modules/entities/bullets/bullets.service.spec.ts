import { BadRequestException } from '@nestjs/common';

import type { PrismaService } from '../../prisma/index.js';
import { BulletsService } from './bullets.service.js';

jest.mock('../../prisma/index.js', () => ({ PrismaService: class {} }));
jest.mock('@resume-builder/entities', () => ({
	BulletSourceType: { JOB: 'job', PROJECT: 'project', VOLUNTEERING: 'volunteering' },
	BulletStatus: { DRAFT: 'draft', READY: 'ready', ARCHIVED: 'archived' },
	createBulletSchema: {
		safeParse: (input: { text: string }) => ({
			success: true,
			data: { ...input, text: input.text.trim() },
		}),
	},
	updateBulletSchema: {
		safeParse: (input: Record<string, unknown>) => {
			for (const [key, value] of Object.entries(input)) {
				if (
					key.endsWith('Score') &&
					typeof value === 'number' &&
					(value < 0 || value > 1)
				) {
					return {
						success: false,
						error: { issues: [{ message: 'Score must be between zero and one' }] },
					};
				}
			}

			return { success: true, data: input };
		},
	},
}));

const BulletSourceType = {
	JOB: 'job',
	PROJECT: 'project',
} as const;
const BulletStatus = { DRAFT: 'draft', ARCHIVED: 'archived' } as const;

describe('BulletsService', () => {
	const uid = 'auth0|owner';
	const savedBullet = {
		id: 'bullet-1',
		uid,
		text: 'Improved latency by 30%',
		sourceType: BulletSourceType.JOB,
		sourceId: 'job-1',
		status: BulletStatus.DRAFT,
		position: 0,
		concepts: [],
		contextScore: null,
		contextNote: null,
		actionScore: null,
		actionNote: null,
		outcomeScore: null,
		outcomeNote: null,
		clarityScore: null,
		clarityNote: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	};
	const prisma = {
		$transaction: jest.fn(),
		bullet: {
			findMany: jest.fn(),
			findFirst: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			updateMany: jest.fn(),
		},
		concept: { upsert: jest.fn() },
		bulletConcept: {
			upsert: jest.fn(),
			deleteMany: jest.fn(),
			createMany: jest.fn(),
			findMany: jest.fn(),
		},
		job: { findFirst: jest.fn() },
		project: { findFirst: jest.fn() },
		volunteering: { findFirst: jest.fn() },
	};
	let service: BulletsService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new BulletsService(prisma as unknown as PrismaService);
		prisma.job.findFirst.mockResolvedValue({ id: 'job-1' });
		prisma.bullet.create.mockResolvedValue(savedBullet);
		prisma.bullet.findFirst.mockResolvedValue(savedBullet);
		prisma.bullet.update.mockResolvedValue(savedBullet);
		prisma.concept.upsert.mockResolvedValue({
			id: 'concept-1',
			vocabulary: 'capability',
			key: 'technical-leadership',
			label: 'Technical Leadership',
		});
		prisma.bulletConcept.upsert.mockResolvedValue({
			bulletId: savedBullet.id,
			conceptId: 'concept-1',
			relation: 'demonstrates',
		});
		prisma.bulletConcept.deleteMany.mockResolvedValue({ count: 1 });
		prisma.bulletConcept.createMany.mockResolvedValue({ count: 1 });
		prisma.bulletConcept.findMany.mockResolvedValue([]);
		prisma.$transaction.mockImplementation(
			(
				operationsOrCallback:
					| Array<Promise<unknown>>
					| ((client: typeof prisma) => unknown),
			) =>
				typeof operationsOrCallback === 'function'
					? operationsOrCallback(prisma)
					: Promise.all(operationsOrCallback),
		);
	});

	it('creates a trimmed bullet after verifying source ownership', async () => {
		await service.create(uid, {
			text: '  Improved latency by 30%  ',
			sourceType: BulletSourceType.JOB,
			sourceId: 'job-1',
		});

		expect(prisma.job.findFirst).toHaveBeenCalledWith({
			where: { id: 'job-1', uid },
			select: { id: true },
		});
		expect(prisma.bullet.create).toHaveBeenCalledWith({
			data: expect.objectContaining({ uid, text: 'Improved latency by 30%' }),
			include: { concepts: { include: { concept: true } } },
		});
	});

	it('rejects a source not owned by the current user', async () => {
		prisma.project.findFirst.mockResolvedValue(null);

		await expect(
			service.create(uid, {
				text: 'Built the product',
				sourceType: BulletSourceType.PROJECT as never,
				sourceId: 'someone-elses-project',
			}),
		).rejects.toBeInstanceOf(BadRequestException);
	});

	it('rejects CAR and clarity scores outside zero to one', async () => {
		await expect(service.update(uid, 'bullet-1', { outcomeScore: 1.1 })).rejects.toThrow();
		expect(prisma.bullet.update).not.toHaveBeenCalled();
	});

	it('excludes archived bullets unless explicitly requested', async () => {
		prisma.bullet.findMany.mockResolvedValue([]);

		await service.findAll(uid);
		expect(prisma.bullet.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { uid, status: { not: BulletStatus.ARCHIVED } },
			}),
		);

		await service.findAll(uid, { includeArchived: true });
		expect(prisma.bullet.findMany).toHaveBeenLastCalledWith(
			expect.objectContaining({ where: { uid } }),
		);
	});

	it('swaps positions only for bullets owned by the same source', async () => {
		const target = { ...savedBullet, id: 'bullet-2', position: 1 };
		prisma.bullet.findMany.mockResolvedValue([savedBullet, target]);

		await service.reorder(uid, savedBullet.id, target.id);

		expect(prisma.bullet.update).toHaveBeenNthCalledWith(1, {
			where: { id: savedBullet.id },
			data: { position: target.position },
			include: { concepts: { include: { concept: true } } },
		});
		expect(prisma.bullet.update).toHaveBeenNthCalledWith(2, {
			where: { id: target.id },
			data: { position: savedBullet.position },
			include: { concepts: { include: { concept: true } } },
		});
	});

	it('rejects reordering bullets from different sources', async () => {
		prisma.bullet.findMany.mockResolvedValue([
			savedBullet,
			{ ...savedBullet, id: 'bullet-2', sourceId: 'job-2', position: 1 },
		]);

		await expect(service.reorder(uid, 'bullet-1', 'bullet-2')).rejects.toBeInstanceOf(
			BadRequestException,
		);
		expect(prisma.$transaction).not.toHaveBeenCalled();
	});

	it('adds a normalized semantic relationship', async () => {
		await service.upsertConcept(uid, savedBullet.id, {
			relation: 'demonstrates',
			concept: {
				vocabulary: 'capability',
				key: 'Technical Leadership',
				label: 'Technical Leadership',
			},
		});

		expect(prisma.concept.upsert).toHaveBeenCalledWith({
			where: {
				vocabulary_key: {
					vocabulary: 'capability',
					key: 'technical-leadership',
				},
			},
			create: {
				vocabulary: 'capability',
				key: 'technical-leadership',
				label: 'Technical Leadership',
			},
			update: { label: 'Technical Leadership' },
		});
		expect(prisma.bulletConcept.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				create: expect.objectContaining({
					bulletId: savedBullet.id,
					relation: 'demonstrates',
				}),
			}),
		);
	});

	it('replaces classifier assertions without deleting user assertions', async () => {
		await service.replaceGeneratedConcepts(uid, savedBullet.id, savedBullet.text, [
			{
				relation: 'supports',
				concept: {
					vocabulary: 'outcome',
					key: 'Latency Reduction',
					label: 'Latency Reduction',
				},
				confidence: 0.95,
			},
		]);

		expect(prisma.bulletConcept.deleteMany).toHaveBeenCalledWith({
			where: { bulletId: savedBullet.id, source: 'classifier' },
		});
		expect(prisma.bulletConcept.createMany).toHaveBeenCalledWith({
			data: [
				expect.objectContaining({
					bulletId: savedBullet.id,
					relation: 'supports',
					source: 'classifier',
					confidence: 0.95,
				}),
			],
			skipDuplicates: true,
		});
	});

	it('rejects classifier assertions when the authoritative bullet changed', async () => {
		await expect(
			service.replaceGeneratedConcepts(uid, savedBullet.id, 'Old bullet text', []),
		).rejects.toBeInstanceOf(BadRequestException);
		expect(prisma.bulletConcept.deleteMany).not.toHaveBeenCalled();
	});

	it('rejects relation and vocabulary mismatches', async () => {
		await expect(
			service.upsertConcept(uid, savedBullet.id, {
				relation: 'uses',
				concept: {
					vocabulary: 'capability',
					key: 'mentoring',
					label: 'Mentoring',
				},
			}),
		).rejects.toBeInstanceOf(BadRequestException);
	});

	it('removes only the requested semantic relationship', async () => {
		await service.deleteConcept(uid, savedBullet.id, 'concept-1', 'supports');

		expect(prisma.bulletConcept.deleteMany).toHaveBeenCalledWith({
			where: {
				bulletId: savedBullet.id,
				conceptId: 'concept-1',
				relation: 'supports',
			},
		});
	});
});
