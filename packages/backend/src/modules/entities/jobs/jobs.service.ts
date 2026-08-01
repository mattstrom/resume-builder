import { Injectable, NotFoundException } from '@nestjs/common';
import { BulletSourceType, BulletStatus, Job, JobInput } from '@resume-builder/entities';

import { PrismaService } from '../../prisma/index.js';

@Injectable()
export class JobsService {
	constructor(private readonly prisma: PrismaService) {}

	async findAll(uid: string): Promise<(Job & { _id: string })[]> {
		const results = await this.prisma.job.findMany({ where: { uid } });
		return results.map((r) => ({ ...r, _id: r.id }) as Job & { _id: string });
	}

	async find(uid: string, id: string): Promise<Job & { _id: string }> {
		const result = await this.prisma.job.findFirst({ where: { id, uid } });
		if (!result) throw new NotFoundException(`Job with id ${id} not found`);
		return { ...result, _id: result.id } as Job & { _id: string };
	}

	async create(uid: string, jobData: JobInput): Promise<Job & { _id: string }> {
		const result = await this.prisma.job.create({ data: { ...jobData, uid } });
		return { ...result, _id: result.id } as Job & { _id: string };
	}

	async update(uid: string, id: string, jobData: JobInput): Promise<Job & { _id: string }> {
		const existing = await this.prisma.job.findFirst({ where: { id, uid } });
		if (!existing) throw new NotFoundException(`Job with id ${id} not found`);
		const result = await this.prisma.job.update({ where: { id }, data: jobData });
		return { ...result, _id: result.id } as Job & { _id: string };
	}

	async delete(uid: string, id: string): Promise<void> {
		const existing = await this.prisma.job.findFirst({ where: { id, uid } });
		if (!existing) throw new NotFoundException(`Job with id ${id} not found`);
		await this.prisma.$transaction([
			this.prisma.bullet.updateMany({
				where: { uid, sourceType: BulletSourceType.JOB, sourceId: id },
				data: { status: BulletStatus.ARCHIVED },
			}),
			this.prisma.job.delete({ where: { id } }),
		]);
	}
}
