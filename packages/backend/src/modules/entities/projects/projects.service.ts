import { Injectable, NotFoundException } from '@nestjs/common';
import {
	BulletSourceType,
	BulletStatus,
	Project,
	ProjectInput,
} from '@resume-builder/entities';

import { PrismaService } from '../../prisma/index.js';

@Injectable()
export class ProjectsService {
	constructor(private readonly prisma: PrismaService) {}

	async findAll(uid: string): Promise<(Project & { _id: string })[]> {
		const results = await this.prisma.project.findMany({ where: { uid } });
		return results.map((r) => ({ ...r, _id: r.id }) as Project & { _id: string });
	}

	async find(uid: string, id: string): Promise<Project & { _id: string }> {
		const result = await this.prisma.project.findFirst({ where: { id, uid } });
		if (!result) throw new NotFoundException(`Project with id ${id} not found`);
		return { ...result, _id: result.id } as Project & { _id: string };
	}

	async create(uid: string, projectData: ProjectInput): Promise<Project & { _id: string }> {
		const result = await this.prisma.project.create({ data: { ...projectData, uid } });
		return { ...result, _id: result.id } as Project & { _id: string };
	}

	async update(
		uid: string,
		id: string,
		projectData: ProjectInput,
	): Promise<Project & { _id: string }> {
		const existing = await this.prisma.project.findFirst({ where: { id, uid } });
		if (!existing) throw new NotFoundException(`Project with id ${id} not found`);
		const result = await this.prisma.project.update({ where: { id }, data: projectData });
		return { ...result, _id: result.id } as Project & { _id: string };
	}

	async delete(uid: string, id: string): Promise<void> {
		const existing = await this.prisma.project.findFirst({ where: { id, uid } });
		if (!existing) throw new NotFoundException(`Project with id ${id} not found`);
		await this.prisma.$transaction([
			this.prisma.bullet.updateMany({
				where: { uid, sourceType: BulletSourceType.PROJECT, sourceId: id },
				data: { status: BulletStatus.ARCHIVED },
			}),
			this.prisma.project.delete({ where: { id } }),
		]);
	}
}
