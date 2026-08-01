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
			orderBy: [
				{ sourceType: 'asc' },
				{ sourceId: 'asc' },
				{ position: 'asc' },
				{ createdAt: 'asc' },
			],
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
		const lastBullet = await this.prisma.bullet.findFirst({
			where: { uid, sourceType: data.sourceType, sourceId: data.sourceId },
			orderBy: { position: 'desc' },
			select: { position: true },
		});
		return this.prisma.bullet.create({
			data: { ...data, uid, position: (lastBullet?.position ?? -1) + 1 },
		});
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

	async reorder(uid: string, id: string, targetId: string): Promise<Bullet[]> {
		if (id === targetId) return [await this.find(uid, id)];

		const bullets = await this.prisma.bullet.findMany({
			where: { uid, id: { in: [id, targetId] } },
		});
		if (bullets.length !== 2) {
			throw new NotFoundException('One or more bullets could not be found');
		}

		const bullet = bullets.find((candidate) => candidate.id === id)!;
		const target = bullets.find((candidate) => candidate.id === targetId)!;
		if (bullet.sourceType !== target.sourceType || bullet.sourceId !== target.sourceId) {
			throw new BadRequestException('Bullets can only be reordered within the same source');
		}

		return this.prisma.$transaction([
			this.prisma.bullet.update({
				where: { id: bullet.id },
				data: { position: target.position },
			}),
			this.prisma.bullet.update({
				where: { id: target.id },
				data: { position: bullet.position },
			}),
		]);
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
