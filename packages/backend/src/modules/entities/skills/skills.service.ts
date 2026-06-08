import { Injectable, NotFoundException } from '@nestjs/common';
import { Skill, SkillInput } from '@resume-builder/entities';

import { PrismaService } from '../../prisma/index.js';

@Injectable()
export class SkillsService {
	constructor(private readonly prisma: PrismaService) {}

	async findAll(uid: string, categories?: string[]): Promise<(Skill & { _id: string })[]> {
		const results = await this.prisma.skill.findMany({
			where: { uid, ...(categories?.length ? { category: { in: categories } } : {}) },
		});
		return results.map((r) => ({ ...r, _id: r.id }) as Skill & { _id: string });
	}

	async create(uid: string, skillData: SkillInput): Promise<Skill & { _id: string }> {
		const result = await this.prisma.skill.create({ data: { ...skillData, uid } });
		return { ...result, _id: result.id } as Skill & { _id: string };
	}

	async update(uid: string, id: string, skillData: SkillInput): Promise<Skill & { _id: string }> {
		const existing = await this.prisma.skill.findFirst({ where: { id, uid } });
		if (!existing) throw new NotFoundException(`Skill with id ${id} not found`);
		const result = await this.prisma.skill.update({ where: { id }, data: skillData });
		return { ...result, _id: result.id } as Skill & { _id: string };
	}

	async delete(uid: string, id: string): Promise<void> {
		const existing = await this.prisma.skill.findFirst({ where: { id, uid } });
		if (!existing) throw new NotFoundException(`Skill with id ${id} not found`);
		await this.prisma.skill.delete({ where: { id } });
	}
}
