import { Injectable } from '@nestjs/common';
import { Skill } from '@resume-builder/entities';

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
}
