import { Injectable } from '@nestjs/common';
import { NarrativeSummaryData, Profile, ProfileUpdateInput } from '@resume-builder/entities';

import { PrismaService } from '../../prisma/index.js';

@Injectable()
export class ProfilesService {
	constructor(private readonly prisma: PrismaService) {}

	async findOne(uid: string): Promise<(Profile & { _id: string }) | null> {
		const result = await this.prisma.profile.findFirst({ where: { uid } });
		return result ? ({ ...result, _id: result.id } as Profile & { _id: string }) : null;
	}

	async upsert(uid: string, input: ProfileUpdateInput): Promise<Profile & { _id: string }> {
		const result = await this.prisma.profile.upsert({
			where: { uid },
			update: input,
			create: { uid, ...input },
		});
		return { ...result, _id: result.id } as Profile & { _id: string };
	}

	async updateNarrativeSummary(
		uid: string,
		narrativeSummary: NarrativeSummaryData,
	): Promise<Profile & { _id: string }> {
		const result = await this.prisma.profile.upsert({
			where: { uid },
			update: { narrativeSummary: narrativeSummary as object },
			create: { uid, narrativeSummary: narrativeSummary as object },
		});
		return { ...result, _id: result.id } as Profile & { _id: string };
	}
}
