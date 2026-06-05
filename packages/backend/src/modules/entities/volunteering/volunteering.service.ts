import { Injectable } from '@nestjs/common';
import { Volunteering, VolunteeringInput } from '@resume-builder/entities';

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
}
