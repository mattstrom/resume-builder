import { NotFoundException } from '@nestjs/common';

import type { PrismaService } from '../../prisma';
import type { ResumeXmlRepository } from './resume-xml.repository';
import type { EmbeddingService } from '../../queue/embeddings/embedding.service';
import { ResumesService } from './resumes.service';

jest.mock('../../prisma/index.js', () => ({ PrismaService: class {} }));
jest.mock('@resume-builder/entities', () => ({
	ResumeSortBy: {
		COMPANY: 'COMPANY',
		DATE: 'DATE',
		LEVEL: 'LEVEL',
	},
	resumeSummarySchema: {
		safeParse: (value: unknown) =>
			value ? { success: true, data: value } : { success: false },
	},
}));

describe('ResumesService', () => {
	const uid = 'auth0|test';
	const prisma = {
		$queryRawUnsafe: jest.fn(),
		$transaction: jest.fn(),
		documentUpdate: {
			deleteMany: jest.fn(),
		},
		resume: {
			delete: jest.fn(),
			findFirst: jest.fn(),
			findMany: jest.fn(),
			update: jest.fn(),
			updateMany: jest.fn(),
		},
		resumeFact: {
			deleteMany: jest.fn(),
		},
	};
	const resumeXml = {
		find: jest.fn(),
	};
	const embedding = { embed: jest.fn() };

	let service: ResumesService;

	beforeEach(() => {
		jest.clearAllMocks();
		prisma.$transaction.mockResolvedValue([]);
		prisma.documentUpdate.deleteMany.mockReturnValue(
			Promise.resolve({ count: 1 }),
		);
		prisma.resume.delete.mockReturnValue(Promise.resolve({ id: 'resume-1' }));
		prisma.resume.updateMany.mockReturnValue(Promise.resolve({ count: 1 }));
		prisma.resumeFact.deleteMany.mockReturnValue(Promise.resolve({ count: 1 }));
		resumeXml.find.mockResolvedValue(null);
		service = new ResumesService(
			prisma as unknown as PrismaService,
			resumeXml as unknown as ResumeXmlRepository,
			embedding as unknown as EmbeddingService,
		);
	});

	it('fuses tenant-scoped lexical and semantic resume matches', async () => {
		prisma.$queryRawUnsafe
			.mockResolvedValueOnce([
				{
					id: 'resume-name',
					nameMatch: true,
					companyMatch: false,
					lexicalScore: 0.8,
				},
				{
					id: 'resume-semantic',
					nameMatch: false,
					companyMatch: false,
					lexicalScore: 0.3,
				},
			])
			.mockResolvedValueOnce([
				{ id: 'resume-semantic', distance: 0.1 },
				{ id: 'resume-name', distance: 0.2 },
			]);
		embedding.embed.mockResolvedValue([0.1, 0.2]);
		prisma.resume.findMany.mockResolvedValue([
			{
				id: 'resume-name',
				uid,
				name: 'Platform resume',
				company: '',
				level: null,
				base: true,
				applicationId: null,
				summary: null,
				updatedAt: new Date(),
			},
			{
				id: 'resume-semantic',
				uid,
				name: 'Other',
				company: '',
				level: null,
				base: false,
				applicationId: 'app-1',
				updatedAt: new Date(),
				summary: {
					dominantTheme: 'distributed platform engineering',
					summaryTheme: 'Reliable services',
					projects: [],
					technologies: [],
					contentThemes: ['distributed systems'],
				},
			},
		]);

		const results = await service.search(uid, 'platform', 10);

		expect(results.map(({ resumeId }) => resumeId)).toEqual([
			'resume-name',
			'resume-semantic',
		]);
		expect(results[0]?.matches).toContainEqual({ kind: 'NAME', label: 'Name' });
		expect(results[1]?.matches).toContainEqual({
			kind: 'SEMANTIC',
			label: 'Similar content',
		});
		expect(prisma.$queryRawUnsafe.mock.calls[0][1]).toBe(uid);
		expect(prisma.$queryRawUnsafe.mock.calls[1][2]).toBe(uid);
		expect(prisma.resume.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: expect.objectContaining({ uid }) }),
		);
	});

	it('renames an owned resume', async () => {
		prisma.resume.findFirst.mockResolvedValue({ id: 'resume-1' });
		prisma.resume.update.mockResolvedValue({
			id: 'resume-1',
			uid,
			name: 'Renamed resume',
			data: {},
		});

		const result = await service.update(uid, 'resume-1', {
			name: 'Renamed resume',
		});

		expect(prisma.resume.findFirst).toHaveBeenCalledWith({
			where: { id: 'resume-1', uid },
			select: { id: true },
		});
		expect(prisma.resume.update).toHaveBeenCalledWith({
			where: { id: 'resume-1' },
			data: { name: 'Renamed resume' },
		});
		expect(result).toMatchObject({ _id: 'resume-1', name: 'Renamed resume' });
	});

	it('does not update a resume that is not owned by the user', async () => {
		prisma.resume.findFirst.mockResolvedValue(null);

		await expect(
			service.update(uid, 'resume-1', { name: 'Renamed resume' }),
		).rejects.toBeInstanceOf(NotFoundException);

		expect(prisma.resume.update).not.toHaveBeenCalled();
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

		await expect(service.delete(uid, 'resume-1')).rejects.toBeInstanceOf(
			NotFoundException,
		);

		expect(prisma.$transaction).not.toHaveBeenCalled();
	});
});
