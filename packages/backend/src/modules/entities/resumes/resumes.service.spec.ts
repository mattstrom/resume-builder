import { NotFoundException } from '@nestjs/common';

import type { PrismaService } from '../../prisma';
import { ResumesService } from './resumes.service';

jest.mock('../../prisma/index.js', () => ({ PrismaService: class {} }));
jest.mock('@resume-builder/entities', () => ({
	ResumeSortBy: {
		COMPANY: 'COMPANY',
		DATE: 'DATE',
		LEVEL: 'LEVEL',
	},
}));

describe('ResumesService', () => {
	const uid = 'auth0|test';
	const prisma = {
		$transaction: jest.fn(),
		documentUpdate: {
			deleteMany: jest.fn(),
		},
		resume: {
			delete: jest.fn(),
			findFirst: jest.fn(),
			updateMany: jest.fn(),
		},
		resumeFact: {
			deleteMany: jest.fn(),
		},
	};

	let service: ResumesService;

	beforeEach(() => {
		jest.clearAllMocks();
		prisma.$transaction.mockResolvedValue([]);
		prisma.documentUpdate.deleteMany.mockReturnValue(Promise.resolve({ count: 1 }));
		prisma.resume.delete.mockReturnValue(Promise.resolve({ id: 'resume-1' }));
		prisma.resume.updateMany.mockReturnValue(Promise.resolve({ count: 1 }));
		prisma.resumeFact.deleteMany.mockReturnValue(Promise.resolve({ count: 1 }));
		service = new ResumesService(prisma as unknown as PrismaService);
	});

	it('deletes an owned resume and its related data', async () => {
		prisma.resume.findFirst.mockResolvedValue({ id: 'resume-1' });

		await service.delete(uid, 'resume-1');

		expect(prisma.resume.findFirst).toHaveBeenCalledWith({
			where: { id: 'resume-1', uid },
			select: { id: true },
		});
		expect(prisma.resume.updateMany).toHaveBeenCalledWith({
			where: { sourceResumeId: 'resume-1' },
			data: { sourceResumeId: null },
		});
		expect(prisma.resumeFact.deleteMany).toHaveBeenCalledWith({
			where: { resumeId: 'resume-1' },
		});
		expect(prisma.documentUpdate.deleteMany).toHaveBeenCalledWith({
			where: { name: 'resume:resume-1', uid },
		});
		expect(prisma.resume.delete).toHaveBeenCalledWith({
			where: { id: 'resume-1' },
		});
		expect(prisma.$transaction).toHaveBeenCalledTimes(1);
	});

	it('does not delete a resume that is not owned by the user', async () => {
		prisma.resume.findFirst.mockResolvedValue(null);

		await expect(service.delete(uid, 'resume-1')).rejects.toBeInstanceOf(NotFoundException);

		expect(prisma.$transaction).not.toHaveBeenCalled();
	});
});
