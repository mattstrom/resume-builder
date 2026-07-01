import { Injectable, NotFoundException } from '@nestjs/common';
import { Education, EducationInput } from '@resume-builder/entities';

import { PrismaService } from '../../prisma/index.js';

type EducationWithId = Education & { _id: string };

@Injectable()
export class EducationsService {
	constructor(private readonly prisma: PrismaService) {}

	async findAll(uid: string): Promise<EducationWithId[]> {
		const results = await this.prisma.education.findMany({ where: { uid } });
		return results.map((r) => ({ ...r, _id: r.id }) as EducationWithId);
	}

	async find(uid: string, id: string): Promise<EducationWithId> {
		const result = await this.prisma.education.findFirst({ where: { id, uid } });
		if (!result) {
			throw new NotFoundException(`Education with id ${id} not found`);
		}
		return { ...result, _id: result.id } as EducationWithId;
	}

	async create(uid: string, educationData: EducationInput): Promise<EducationWithId> {
		const result = await this.prisma.education.create({ data: { ...educationData, uid } });
		return { ...result, _id: result.id } as EducationWithId;
	}

	async update(uid: string, id: string, educationData: EducationInput): Promise<EducationWithId> {
		const existing = await this.prisma.education.findFirst({ where: { id, uid } });
		if (!existing) {
			throw new NotFoundException(`Education with id ${id} not found`);
		}
		const result = await this.prisma.education.update({ where: { id }, data: educationData });
		return { ...result, _id: result.id } as EducationWithId;
	}

	async delete(uid: string, id: string): Promise<void> {
		const existing = await this.prisma.education.findFirst({ where: { id, uid } });
		if (!existing) {
			throw new NotFoundException(`Education with id ${id} not found`);
		}
		await this.prisma.education.delete({ where: { id } });
	}
}
