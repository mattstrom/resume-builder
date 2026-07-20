import { Injectable, NotFoundException } from '@nestjs/common';
import { Application, ApplicationInput, ApplicationUpdateInput } from '@resume-builder/entities';

import { PrismaService } from '../../prisma/index.js';
import { CompaniesService } from '../companies/companies.service.js';
import { ResumesService } from '../resumes/resumes.service.js';

type ApplicationWithId = Application & { _id: string };

@Injectable()
export class ApplicationsService {
	constructor(
		private readonly resumeService: ResumesService,
		private readonly companiesService: CompaniesService,
		private readonly prisma: PrismaService,
	) {}

	async findAll(uid: string): Promise<ApplicationWithId[]> {
		const results = await this.prisma.application.findMany({
			where: { uid },
			orderBy: { updatedAt: 'desc' },
		});
		return results.map((r) => ({ ...r, _id: r.id }) as ApplicationWithId);
	}

	async find(uid: string, id: string): Promise<ApplicationWithId> {
		const result = await this.prisma.application.findFirst({ where: { id, uid } });
		if (!result) throw new NotFoundException();
		return { ...result, _id: result.id } as ApplicationWithId;
	}

	async create(
		uid: string,
		applicationData: ApplicationInput,
		includeResume: boolean = true,
	): Promise<ApplicationWithId> {
		if (applicationData.companyId) {
			await this.companiesService.find(uid, applicationData.companyId);
		}

		const saved = await this.prisma.application.create({
			data: { ...applicationData, uid },
		});

		if (includeResume) {
			await this.resumeService.createBlank(uid, {
				name: 'Untitled Resume',
				company: applicationData.company,
				jobPostingUrl: applicationData.jobPostingUrl,
				base: false,
				applicationId: saved.id,
			});
		}

		return { ...saved, _id: saved.id } as ApplicationWithId;
	}

	async update(
		uid: string,
		id: string,
		updateData: ApplicationUpdateInput,
	): Promise<ApplicationWithId> {
		const existing = await this.prisma.application.findFirst({ where: { id, uid } });
		if (!existing) throw new NotFoundException(`Application with id ${id} not found`);

		if (updateData.companyId) {
			await this.companiesService.find(uid, updateData.companyId);
		}

		const result = await this.prisma.application.update({ where: { id }, data: updateData });
		return { ...result, _id: result.id } as ApplicationWithId;
	}

	async updateAssessment(
		uid: string,
		id: string,
		assessment: {
			jobSummary: Application['jobSummary'];
			analysis: Application['analysis'];
		},
	): Promise<ApplicationWithId> {
		const existing = await this.prisma.application.findFirst({ where: { id, uid } });
		if (!existing) throw new NotFoundException(`Application with id ${id} not found`);

		const result = await this.prisma.application.update({
			where: { id },
			data: {
				jobSummary: assessment.jobSummary as object,
				analysis: assessment.analysis as object,
			},
		});
		return { ...result, _id: result.id } as ApplicationWithId;
	}

	async updateAnalysis(
		uid: string,
		id: string,
		analysis: Application['analysis'],
	): Promise<ApplicationWithId> {
		const existing = await this.prisma.application.findFirst({ where: { id, uid } });
		if (!existing) throw new NotFoundException(`Application with id ${id} not found`);

		const result = await this.prisma.application.update({
			where: { id },
			data: { analysis: analysis as object },
		});
		return { ...result, _id: result.id } as ApplicationWithId;
	}

	async delete(uid: string, id: string): Promise<void> {
		const result = await this.prisma.application.deleteMany({ where: { id, uid } });
		if (result.count === 0) throw new NotFoundException();
	}

	async patch(uid: string, id: string, update: Record<string, unknown>): Promise<void> {
		const data = '$set' in update ? (update['$set'] as Record<string, unknown>) : update;
		if (typeof data.companyId === 'string') {
			await this.companiesService.find(uid, data.companyId);
		}
		await this.prisma.application.updateMany({ where: { id, uid }, data });
	}
}
