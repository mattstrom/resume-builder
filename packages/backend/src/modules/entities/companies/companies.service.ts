import { Injectable, NotFoundException } from '@nestjs/common';
import {
	Application,
	Company,
	CompanyAddress,
	CompanyInput,
	CompanyUpdateInput,
} from '@resume-builder/entities';

import { PrismaService } from '../../prisma/index.js';

type ApplicationWithId = Application & { _id: string };

function mapCompany(company: Omit<Company, 'address'> & { address: unknown }): Company {
	return {
		...company,
		address: (company.address ?? {}) as CompanyAddress,
	} as Company;
}

@Injectable()
export class CompaniesService {
	constructor(private readonly prisma: PrismaService) {}

	async findAll(uid: string): Promise<Company[]> {
		const results = await this.prisma.company.findMany({
			where: { createdBy: uid },
			orderBy: { updatedAt: 'desc' },
		});
		return results.map(mapCompany);
	}

	async find(uid: string, id: string): Promise<Company> {
		const result = await this.prisma.company.findFirst({ where: { id, createdBy: uid } });
		if (!result) {
			throw new NotFoundException(`Company with id ${id} not found`);
		}
		return mapCompany(result);
	}

	async findApplications(uid: string, id: string): Promise<ApplicationWithId[]> {
		await this.find(uid, id);
		const results = await this.prisma.application.findMany({
			where: { uid, companyId: id },
			orderBy: { updatedAt: 'desc' },
		});
		return results.map((result) => ({ ...result, _id: result.id }) as ApplicationWithId);
	}

	async create(uid: string, companyData: CompanyInput): Promise<Company> {
		const result = await this.prisma.company.create({
			data: {
				...companyData,
				address: companyData.address ?? {},
				createdBy: uid,
				updatedBy: uid,
			},
		});
		return mapCompany(result);
	}

	async update(uid: string, id: string, companyData: CompanyUpdateInput): Promise<Company> {
		const existing = await this.prisma.company.findFirst({ where: { id, createdBy: uid } });
		if (!existing) {
			throw new NotFoundException(`Company with id ${id} not found`);
		}

		const result = await this.prisma.company.update({
			where: { id },
			data: {
				...companyData,
				updatedBy: uid,
			},
		});
		return mapCompany(result);
	}

	async delete(uid: string, id: string): Promise<void> {
		const result = await this.prisma.company.deleteMany({ where: { id, createdBy: uid } });
		if (result.count === 0) {
			throw new NotFoundException(`Company with id ${id} not found`);
		}
	}
}
