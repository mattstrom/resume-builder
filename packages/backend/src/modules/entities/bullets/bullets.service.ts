import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
	BulletFilterInput,
	BulletSourceType,
	BulletStatus,
	createBulletSchema,
	CreateBulletInput,
	updateBulletSchema,
	UpdateBulletInput,
} from '@resume-builder/entities';

import type { Bullet } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/index.js';

@Injectable()
export class BulletsService {
	constructor(private readonly prisma: PrismaService) {}

	async findAll(uid: string, filter: BulletFilterInput = {}): Promise<Bullet[]> {
		return this.prisma.bullet.findMany({
			where: {
				uid,
				...(filter.sourceType ? { sourceType: filter.sourceType } : {}),
				...(filter.sourceId ? { sourceId: filter.sourceId } : {}),
				...(filter.status
					? { status: filter.status }
					: filter.includeArchived
						? {}
						: { status: { not: BulletStatus.ARCHIVED } }),
				...(filter.search?.trim()
					? { text: { contains: filter.search.trim(), mode: 'insensitive' } }
					: {}),
			},
			orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
		});
	}

	async find(uid: string, id: string): Promise<Bullet> {
		const bullet = await this.prisma.bullet.findFirst({ where: { id, uid } });
		if (!bullet) throw new NotFoundException(`Bullet with id ${id} not found`);
		return bullet;
	}

	async create(uid: string, input: CreateBulletInput): Promise<Bullet> {
		const parsed = createBulletSchema.safeParse(input);
		if (!parsed.success) {
			throw new BadRequestException(
				parsed.error.issues.map(({ message }) => message).join('; '),
			);
		}
		const data = parsed.data;
		await this.assertSource(uid, data.sourceType, data.sourceId);
		return this.prisma.bullet.create({ data: { ...data, uid } });
	}

	async update(uid: string, id: string, input: UpdateBulletInput): Promise<Bullet> {
		await this.find(uid, id);
		const parsed = updateBulletSchema.safeParse(input);
		if (!parsed.success) {
			throw new BadRequestException(
				parsed.error.issues.map(({ message }) => message).join('; '),
			);
		}
		const data = parsed.data;
		return this.prisma.bullet.update({ where: { id }, data });
	}

	async setStatus(uid: string, id: string, status: BulletStatus): Promise<Bullet> {
		await this.find(uid, id);
		return this.prisma.bullet.update({ where: { id }, data: { status } });
	}

	async archiveForSource(
		uid: string,
		sourceType: BulletSourceType,
		sourceId: string,
	): Promise<void> {
		await this.prisma.bullet.updateMany({
			where: { uid, sourceType, sourceId },
			data: { status: BulletStatus.ARCHIVED },
		});
	}

	private async assertSource(
		uid: string,
		sourceType: BulletSourceType,
		sourceId: string,
	): Promise<void> {
		const where = { id: sourceId, uid };
		const source =
			sourceType === BulletSourceType.JOB
				? await this.prisma.job.findFirst({ where, select: { id: true } })
				: sourceType === BulletSourceType.PROJECT
					? await this.prisma.project.findFirst({ where, select: { id: true } })
					: await this.prisma.volunteering.findFirst({ where, select: { id: true } });

		if (!source) {
			throw new BadRequestException(
				`The ${sourceType} source ${sourceId} does not belong to the current user`,
			);
		}
	}
}
