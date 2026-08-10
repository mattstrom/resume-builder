import { Injectable, NotFoundException } from '@nestjs/common';
import { Skill, SkillInput } from '@resume-builder/entities';

import type { Prisma } from '../../../generated/prisma/client.js';
import { ConceptsService } from '../../concepts/concepts.service.js';
import { PrismaService } from '../../prisma/index.js';

/** A skill asserts that it *is* the concept it names. */
const SKILL_RELATION = 'is-a';

@Injectable()
export class SkillsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly conceptsService: ConceptsService,
	) {}

	async findAll(uid: string, categories?: string[]): Promise<(Skill & { _id: string })[]> {
		const results = await this.prisma.skill.findMany({
			where: { uid, ...(categories?.length ? { category: { in: categories } } : {}) },
		});
		return results.map((r) => ({ ...r, _id: r.id }) as Skill & { _id: string });
	}

	/**
	 * Re-derives the skill's concept edges from its name.
	 *
	 * Replace rather than merge: the name is the only input, so a rename must not
	 * leave the previous concept attached. A name the ontology cannot resolve
	 * clears the edges and keeps the text — the skill still renders, it just
	 * makes no claim the matcher can check.
	 */
	async syncConcepts(
		prisma: Prisma.TransactionClient,
		skillId: string,
		name: string,
	): Promise<void> {
		const { concepts } = await this.conceptsService.materializeLabels(prisma, [name]);

		await prisma.skillConcept.deleteMany({ where: { skillId } });

		for (const concept of concepts) {
			await prisma.skillConcept.create({
				data: { skillId, conceptId: concept.id, relation: SKILL_RELATION },
			});
		}
	}

	async create(uid: string, skillData: SkillInput): Promise<Skill & { _id: string }> {
		const result = await this.prisma.$transaction(async (prisma) => {
			const created = await prisma.skill.create({ data: { ...skillData, uid } });
			await this.syncConcepts(prisma, created.id, created.name);

			return created;
		});

		return { ...result, _id: result.id } as Skill & { _id: string };
	}

	async update(uid: string, id: string, skillData: SkillInput): Promise<Skill & { _id: string }> {
		const existing = await this.prisma.skill.findFirst({ where: { id, uid } });
		if (!existing) throw new NotFoundException(`Skill with id ${id} not found`);
		const result = await this.prisma.$transaction(async (prisma) => {
			const updated = await prisma.skill.update({ where: { id }, data: skillData });
			await this.syncConcepts(prisma, updated.id, updated.name);

			return updated;
		});

		return { ...result, _id: result.id } as Skill & { _id: string };
	}

	async delete(uid: string, id: string): Promise<void> {
		const existing = await this.prisma.skill.findFirst({ where: { id, uid } });
		if (!existing) throw new NotFoundException(`Skill with id ${id} not found`);
		await this.prisma.skill.delete({ where: { id } });
	}
}
