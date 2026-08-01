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
		$transaction: jest
			.fn()
			.mockImplementation((operations: Array<Promise<unknown>>) => Promise.all(operations)),
		bullet: {
			findMany: jest.fn(),
			findFirst: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			updateMany: jest.fn(),
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
		});
		expect(prisma.bullet.update).toHaveBeenNthCalledWith(2, {
			where: { id: target.id },
			data: { position: savedBullet.position },
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
});
