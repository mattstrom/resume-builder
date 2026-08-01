import { Injectable, NotFoundException } from '@nestjs/common';
import {
	BulletSourceType,
	BulletStatus,
	Volunteering,
	VolunteeringInput,
} from '@resume-builder/entities';

import { PrismaService } from '../../prisma/index.js';

@Injectable()
export class VolunteeringService {
	constructor(private readonly prisma: PrismaService) {}

	async findAll(uid: string): Promise<(Volunteering & { _id: string })[]> {
		const results = await this.prisma.volunteering.findMany({ where: { uid } });
		return results.map((r) => ({ ...r, _id: r.id }) as Volunteering & { _id: string });
	}

	async create(
		uid: string,
		volunteering: VolunteeringInput,
	): Promise<Volunteering & { _id: string }> {
		const result = await this.prisma.volunteering.create({
			data: { ...volunteering, uid },
		});
		return { ...result, _id: result.id } as Volunteering & { _id: string };
	}

	async update(
		uid: string,
		id: string,
		volunteeringData: VolunteeringInput,
	): Promise<Volunteering & { _id: string }> {
		const existing = await this.prisma.volunteering.findFirst({ where: { id, uid } });
		if (!existing) throw new NotFoundException(`Volunteering with id ${id} not found`);
		const result = await this.prisma.volunteering.update({
			where: { id },
			data: volunteeringData,
		});
		return { ...result, _id: result.id } as Volunteering & { _id: string };
	}

	async delete(uid: string, id: string): Promise<void> {
		const existing = await this.prisma.volunteering.findFirst({ where: { id, uid } });
		if (!existing) throw new NotFoundException(`Volunteering with id ${id} not found`);
		await this.prisma.$transaction([
			this.prisma.bullet.updateMany({
				where: { uid, sourceType: BulletSourceType.VOLUNTEERING, sourceId: id },
				data: { status: BulletStatus.ARCHIVED },
			}),
			this.prisma.volunteering.delete({ where: { id } }),
		]);
	}
}
