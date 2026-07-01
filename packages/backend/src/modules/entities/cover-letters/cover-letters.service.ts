import { Injectable, NotFoundException } from '@nestjs/common';
import { CoverLetter, CoverLetterInput, CoverLetterUpdateInput } from '@resume-builder/entities';

import { PrismaService } from '../../prisma/index.js';

type CoverLetterWithId = CoverLetter & { _id: string };

@Injectable()
export class CoverLettersService {
	constructor(private readonly prisma: PrismaService) {}

	async findAll(uid: string): Promise<CoverLetterWithId[]> {
		const results = await this.prisma.coverLetter.findMany({ where: { uid } });
		return results.map((r) => ({ ...r, _id: r.id }) as CoverLetterWithId);
	}

	async find(uid: string, id: string): Promise<CoverLetterWithId> {
		const result = await this.prisma.coverLetter.findFirst({ where: { id, uid } });
		if (!result) {
			throw new NotFoundException();
		}
		return { ...result, _id: result.id } as CoverLetterWithId;
	}

	async create(uid: string, coverLetterData: CoverLetterInput): Promise<CoverLetterWithId> {
		const result = await this.prisma.coverLetter.create({ data: { ...coverLetterData, uid } });
		return { ...result, _id: result.id } as CoverLetterWithId;
	}

	async update(
		uid: string,
		id: string,
		updateData: CoverLetterUpdateInput,
	): Promise<CoverLetterWithId> {
		const existing = await this.prisma.coverLetter.findFirst({ where: { id, uid } });
		if (!existing) {
			throw new NotFoundException(`Cover letter with id ${id} not found`);
		}
		const result = await this.prisma.coverLetter.update({ where: { id }, data: updateData });
		return { ...result, _id: result.id } as CoverLetterWithId;
	}

	async patch(uid: string, id: string, update: Record<string, unknown>): Promise<void> {
		const existing = await this.prisma.coverLetter.findFirst({ where: { id, uid } });
		if (!existing) {
			throw new NotFoundException(`Cover letter with id ${id} not found`);
		}
		const fields = '$set' in update ? (update['$set'] as Record<string, unknown>) : update;
		await this.prisma.coverLetter.update({ where: { id }, data: fields });
	}
}
