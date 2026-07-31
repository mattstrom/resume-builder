import { Injectable, NotFoundException } from '@nestjs/common';
import {
	BlankResumeCreateInput,
	Resume,
	ResumeContent,
	ResumeCreateInput,
	ResumeFilterInput,
	ResumeSortBy,
	ResumeSortInput,
	resumeContentFromXml,
	resumeToXml,
} from '@resume-builder/entities';

import { PrismaService } from '../../prisma/index.js';
import { ResumeXmlRepository } from './resume-xml.repository.js';

type ResumeWithId = Resume & { _id: string; xml?: string };

@Injectable()
export class ResumesService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly resumeXml: ResumeXmlRepository,
	) {}

	private async hydrate(result: Record<string, unknown>): Promise<ResumeWithId> {
		const id = String(result.id);
		const uid = String(result.uid);
		const xml = await this.resumeXml.find(uid, id);
		return {
			...result,
			_id: id,
			xml: xml ?? undefined,
			data: xml ? resumeContentFromXml(xml, uid) : (result.data as ResumeContent),
		} as ResumeWithId;
	}

	async findAll(
		uid: string,
		sort?: ResumeSortInput,
		filter?: ResumeFilterInput,
	): Promise<ResumeWithId[]> {
		const where: Record<string, unknown> = { uid };

		if (filter?.base !== undefined) {
			where['base'] = filter.base;
		}
		if (filter?.company) {
			where['company'] = { contains: filter.company, mode: 'insensitive' };
		}
		if (filter?.applicationId) {
			where['applicationId'] = filter.applicationId;
		}

		const orderBy: Record<string, string>[] = [];

		if (sort) {
			const fieldMap: Record<ResumeSortBy, string> = {
				[ResumeSortBy.COMPANY]: 'company',
				[ResumeSortBy.LEVEL]: 'level',
				[ResumeSortBy.DATE]: 'createdAt',
			};
			orderBy.push({ [fieldMap[sort.field]]: sort.ascending ? 'asc' : 'desc' });
		}

		orderBy.push({ name: 'asc' });

		const results = await this.prisma.resume.findMany({ where, orderBy });

		return Promise.all(results.map((result) => this.hydrate(result)));
	}

	async find(uid: string, id: string): Promise<ResumeWithId> {
		const result = await this.prisma.resume.findFirst({ where: { id, uid } });
		if (!result) {
			throw new NotFoundException();
		}
		return this.hydrate(result);
	}

	async create(uid: string, resumeData: ResumeCreateInput): Promise<ResumeWithId> {
		const result = await this.prisma.resume.create({
			data: {
				...resumeData,
				uid,
				data: resumeData.data as object,
			},
		});

		const hydrated = {
			...result,
			_id: result.id,
			data: result.data as ResumeContent,
		} as ResumeWithId;
		const xml = resumeToXml(hydrated);
		await this.resumeXml.upsert(result.id, xml);
		return { ...hydrated, xml };
	}

	async createBlank(uid: string, resumeData: BlankResumeCreateInput): Promise<ResumeWithId> {
		let data: object;
		let sourceXml: string | null = null;

		if (resumeData.sourceResumeId) {
			const sourceResume = await this.prisma.resume.findFirst({
				where: { id: resumeData.sourceResumeId, uid },
			});

			if (!sourceResume) {
				throw new NotFoundException(
					`Resume with id ${resumeData.sourceResumeId} not found`,
				);
			}

			sourceXml = await this.resumeXml.find(uid, sourceResume.id);
			data = sourceXml ? resumeContentFromXml(sourceXml, uid) : (sourceResume.data as object);
		} else {
			const contactInfo = await this.prisma.contactInformation.findFirst({
				where: { uid },
			});

			if (!contactInfo) {
				throw new NotFoundException('Contact information not found');
			}

			data = { contactInformation: contactInfo };
		}

		const result = await this.prisma.resume.create({
			data: {
				...resumeData,
				uid,
				data,
			},
		});

		const hydrated = {
			...result,
			_id: result.id,
			data: result.data as ResumeContent,
		} as ResumeWithId;
		const xml = sourceXml ?? resumeToXml(hydrated);
		await this.resumeXml.upsert(result.id, xml);
		return { ...hydrated, xml };
	}

	async delete(uid: string, id: string): Promise<void> {
		const resume = await this.prisma.resume.findFirst({
			where: { id, uid },
			select: { id: true },
		});

		if (!resume) {
			throw new NotFoundException();
		}

		await this.prisma.$transaction([
			this.prisma.resume.updateMany({
				where: { sourceResumeId: id },
				data: { sourceResumeId: null },
			}),
			this.prisma.resumeFact.deleteMany({ where: { resumeId: id } }),
			this.prisma.documentUpdate.deleteMany({
				where: { name: `resume:${id}`, uid },
			}),
			this.prisma.resume.delete({ where: { id } }),
		]);
	}
}
