import type { PrismaService } from '../../prisma/index.js';
import { JobsService } from './jobs.service.js';

jest.mock('../../prisma/index.js', () => ({ PrismaService: class {} }));
jest.mock('@resume-builder/entities', () => ({
	BulletSourceType: { JOB: 'job' },
	BulletStatus: { ARCHIVED: 'archived' },
}));

const BulletSourceType = { JOB: 'job' } as const;
const BulletStatus = { ARCHIVED: 'archived' } as const;

describe('JobsService', () => {
	it('archives associated bullets in the source deletion transaction', async () => {
		const updateMany = { operation: 'archive' };
		const deleteJob = { operation: 'delete' };
		const prisma = {
			job: {
				findFirst: jest.fn().mockResolvedValue({ id: 'job-1' }),
				delete: jest.fn().mockReturnValue(deleteJob),
			},
			bullet: { updateMany: jest.fn().mockReturnValue(updateMany) },
			$transaction: jest.fn().mockResolvedValue([]),
		};
		const service = new JobsService(prisma as unknown as PrismaService);

		await service.delete('auth0|owner', 'job-1');

		expect(prisma.bullet.updateMany).toHaveBeenCalledWith({
			where: {
				uid: 'auth0|owner',
				sourceType: BulletSourceType.JOB,
				sourceId: 'job-1',
			},
			data: { status: BulletStatus.ARCHIVED },
		});
		expect(prisma.$transaction).toHaveBeenCalledWith([updateMany, deleteJob]);
	});
});
