import { Injectable, NotFoundException } from '@nestjs/common';
import { BulletSourceType, BulletStatus, Project, ProjectInput } from '@resume-builder/entities';

import type { Prisma } from '../../../generated/prisma/client.js';
import { ConceptsService } from '../../concepts/concepts.service.js';
import { PrismaService } from '../../prisma/index.js';

/** A project asserts that it *uses* the technologies it lists. */
const PROJECT_RELATION = 'uses';

@Injectable()
export class ProjectsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly conceptsService: ConceptsService,
	) {}

	async findAll(uid: string): Promise<(Project & { _id: string })[]> {
		const results = await this.prisma.project.findMany({ where: { uid } });
		return results.map((r) => ({ ...r, _id: r.id }) as Project & { _id: string });
	}

	async find(uid: string, id: string): Promise<Project & { _id: string }> {
		const result = await this.prisma.project.findFirst({ where: { id, uid } });
		if (!result) throw new NotFoundException(`Project with id ${id} not found`);
		return { ...result, _id: result.id } as Project & { _id: string };
	}

	/**
	 * Re-derives the project's concept edges from its technologies list.
	 *
	 * The list stays the authoritative display text; these edges are its semantic
	 * mirror, rebuilt on every write so a removed technology drops its claim.
	 * Technologies the ontology cannot resolve simply produce no edge.
	 */
	async syncConcepts(
		prisma: Prisma.TransactionClient,
		projectId: string,
		technologies: readonly string[],
	): Promise<void> {
		const { concepts } = await this.conceptsService.materializeLabels(prisma, technologies);

		await prisma.projectConcept.deleteMany({ where: { projectId } });

		for (const concept of concepts) {
			await prisma.projectConcept.create({
				data: { projectId, conceptId: concept.id, relation: PROJECT_RELATION },
			});
		}
	}

	async create(uid: string, projectData: ProjectInput): Promise<Project & { _id: string }> {
		const result = await this.prisma.$transaction(async (prisma) => {
			const created = await prisma.project.create({ data: { ...projectData, uid } });
			await this.syncConcepts(prisma, created.id, created.technologies);

			return created;
		});

		return { ...result, _id: result.id } as Project & { _id: string };
	}

	async update(
		uid: string,
		id: string,
		projectData: ProjectInput,
	): Promise<Project & { _id: string }> {
		const existing = await this.prisma.project.findFirst({ where: { id, uid } });
		if (!existing) throw new NotFoundException(`Project with id ${id} not found`);
		const result = await this.prisma.$transaction(async (prisma) => {
			const updated = await prisma.project.update({ where: { id }, data: projectData });
			await this.syncConcepts(prisma, updated.id, updated.technologies);

			return updated;
		});

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
