import { Injectable } from '@nestjs/common';
import { ContactInformation, ContactInformationInput } from '@resume-builder/entities';

import { PrismaService } from '../../prisma/index.js';

@Injectable()
export class ContactInformationService {
	constructor(private readonly prisma: PrismaService) {}

	async findAll(uid: string): Promise<(ContactInformation & { _id: string })[]> {
		const results = await this.prisma.contactInformation.findMany({ where: { uid } });
		return results.map((r) => ({ ...r, _id: r.id }) as ContactInformation & { _id: string });
	}

	async findOne(uid: string): Promise<(ContactInformation & { _id: string }) | null> {
		const result = await this.prisma.contactInformation.findFirst({ where: { uid } });
		return result
			? ({ ...result, _id: result.id } as ContactInformation & { _id: string })
			: null;
	}

	async upsert(
		uid: string,
		input: ContactInformationInput,
	): Promise<ContactInformation & { _id: string }> {
		const result = await this.prisma.contactInformation.upsert({
			where: { uid },
			update: input,
			create: { uid, ...input },
		});
		return { ...result, _id: result.id } as ContactInformation & { _id: string };
	}
}
