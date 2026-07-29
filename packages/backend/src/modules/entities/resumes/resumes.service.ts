import { Injectable, NotFoundException } from '@nestjs/common';
import {
	BlankResumeCreateInput,
	Resume,
	ResumeContent,
	ResumeCreateInput,
	ResumeFilterInput,
	ResumeSortBy,
	ResumeSortInput,
} from '@resume-builder/entities';

import { PrismaService } from '../../prisma/index.js';

type ResumeWithId = Resume & { _id: string };

@Injectable()
export class ResumesService {
	constructor(private readonly prisma: PrismaService) {}

	async findAll(
		uid: string,
		sort?: ResumeSortInput,
		filter?: ResumeFilterInput,
	): Promise<ResumeWithId[]> {
		const where: Record<string, unknown> = { uid };

		if (filter?.base !== undefined) {
			where['base'] = filter.base;
		}
		if (filter?.company) {
			where['company'] = { contains: filter.company, mode: 'insensitive' };
		}
		if (filter?.applicationId) {
			where['applicationId'] = filter.applicationId;
		}

		const orderBy: Record<string, string>[] = [];

		if (sort) {
			const fieldMap: Record<ResumeSortBy, string> = {
				[ResumeSortBy.COMPANY]: 'company',
				[ResumeSortBy.LEVEL]: 'level',
				[ResumeSortBy.DATE]: 'createdAt',
			};
			orderBy.push({ [fieldMap[sort.field]]: sort.ascending ? 'asc' : 'desc' });
		}

		orderBy.push({ name: 'asc' });

		const results = await this.prisma.resume.findMany({ where, orderBy });

		return results.map(
			(r) => ({ ...r, _id: r.id, data: r.data as ResumeContent }) as ResumeWithId,
		);
	}

	async find(uid: string, id: string): Promise<ResumeWithId> {
		const result = await this.prisma.resume.findFirst({ where: { id, uid } });
		if (!result) {
			throw new NotFoundException();
		}
		return { ...result, _id: result.id, data: result.data as ResumeContent } as ResumeWithId;
	}

	async create(uid: string, resumeData: ResumeCreateInput): Promise<ResumeWithId> {
		const result = await this.prisma.resume.create({
			data: {
				...resumeData,
				uid,
				data: resumeData.data as object,
			},
		});

		return { ...result, _id: result.id, data: result.data as ResumeContent } as ResumeWithId;
	}

	async createBlank(uid: string, resumeData: BlankResumeCreateInput): Promise<ResumeWithId> {
		let data: object;

		if (resumeData.sourceResumeId) {
			const sourceResume = await this.prisma.resume.findFirst({
				where: { id: resumeData.sourceResumeId, uid },
			});

			if (!sourceResume) {
				throw new NotFoundException(
					`Resume with id ${resumeData.sourceResumeId} not found`,
				);
			}

			data = sourceResume.data as object;
		} else {
			const contactInfo = await this.prisma.contactInformation.findFirst({
				where: { uid },
			});

			if (!contactInfo) {
				throw new NotFoundException('Contact information not found');
			}

			data = { contactInformation: contactInfo };
		}

		const result = await this.prisma.resume.create({
			data: {
				...resumeData,
				uid,
				data,
			},
		});

		return { ...result, _id: result.id, data: result.data as ResumeContent } as ResumeWithId;
	}

	async delete(uid: string, id: string): Promise<void> {
		const resume = await this.prisma.resume.findFirst({
			where: { id, uid },
			select: { id: true },
		});

		if (!resume) {
			throw new NotFoundException();
		}

		await this.prisma.$transaction([
			this.prisma.resume.updateMany({
				where: { sourceResumeId: id },
				data: { sourceResumeId: null },
			}),
			this.prisma.resumeFact.deleteMany({ where: { resumeId: id } }),
			this.prisma.documentUpdate.deleteMany({
				where: { name: `resume:${id}`, uid },
			}),
			this.prisma.resume.delete({ where: { id } }),
		]);
	}
}
