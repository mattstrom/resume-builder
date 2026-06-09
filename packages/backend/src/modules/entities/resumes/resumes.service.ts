import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
	BlankResumeCreateInput,
	Job,
	Project,
	Resume,
	ResumeCollection,
	ResumeContent,
	ResumeCreateInput,
	ResumeFilterInput,
	ResumeSortBy,
	ResumeSortInput,
	ResumeUpdateInput,
	Volunteering,
} from '@resume-builder/entities';

import { PrismaService } from '../../prisma/index.js';

const ALLOWED_PATH_PREFIXES = [
	'data.name',
	'data.title',
	'data.summary',
	'data.contactInformation',
	'data.workExperience',
	'data.education',
	'data.skills',
	'data.skillGroups',
	'data.projects',
	'data.volunteering',
	'name',
	'company',
	'level',
	'jobPostingUrl',
];

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
	const parts = path.split('.');
	let current = obj;
	for (let i = 0; i < parts.length - 1; i++) {
		if (current[parts[i]] === undefined || current[parts[i]] === null) {
			current[parts[i]] = {};
		}
		current = current[parts[i]] as Record<string, unknown>;
	}
	current[parts[parts.length - 1]] = value;
}

type ResumeWithId = Resume & { _id: string };

@Injectable()
export class ResumesService {
	constructor(private readonly prisma: PrismaService) {}

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

		return results.map(
			(r) => ({ ...r, _id: r.id, data: r.data as ResumeContent }) as ResumeWithId,
		);
	}

	async find(uid: string, id: string): Promise<ResumeWithId> {
		const result = await this.prisma.resume.findFirst({ where: { id, uid } });
		if (!result) {
			throw new NotFoundException();
		}
		return { ...result, _id: result.id, data: result.data as ResumeContent } as ResumeWithId;
	}

	async create(uid: string, resumeData: ResumeCreateInput): Promise<ResumeWithId> {
		const result = await this.prisma.resume.create({
			data: {
				...resumeData,
				uid,
				data: resumeData.data as object,
			},
		});

		return { ...result, _id: result.id, data: result.data as ResumeContent } as ResumeWithId;
	}

	async createBlank(uid: string, resumeData: BlankResumeCreateInput): Promise<ResumeWithId> {
		let data: object;

		if (resumeData.sourceResumeId) {
			const sourceResume = await this.prisma.resume.findFirst({
				where: { id: resumeData.sourceResumeId, uid },
			});

			if (!sourceResume) {
				throw new NotFoundException(
					`Resume with id ${resumeData.sourceResumeId} not found`,
				);
			}

			data = sourceResume.data as object;
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

		return { ...result, _id: result.id, data: result.data as ResumeContent } as ResumeWithId;
	}

	async update(uid: string, id: string, updateData: ResumeUpdateInput): Promise<ResumeWithId> {
		const existing = await this.prisma.resume.findFirst({ where: { id, uid } });
		if (!existing) {
			throw new NotFoundException(`Resume with id ${id} not found`);
		}

		const result = await this.prisma.resume.update({
			where: { id },
			data: {
				...updateData,
				data: updateData.data ? (updateData.data as object) : undefined,
			},
		});

		return { ...result, _id: result.id, data: result.data as ResumeContent } as ResumeWithId;
	}

	async patch(uid: string, id: string, update: Record<string, unknown>): Promise<ResumeWithId> {
		const existing = await this.prisma.resume.findFirst({ where: { id, uid } });
		if (!existing) {
			throw new NotFoundException(`Resume with id ${id} not found`);
		}

		const fields = '$set' in update ? (update['$set'] as Record<string, unknown>) : update;
		const result = await this.prisma.resume.update({ where: { id }, data: fields });

		return { ...result, _id: result.id, data: result.data as ResumeContent } as ResumeWithId;
	}

	async setField(uid: string, id: string, path: string, value: unknown): Promise<ResumeWithId> {
		const isAllowed = ALLOWED_PATH_PREFIXES.some(
			(prefix) => path === prefix || path.startsWith(prefix + '.'),
		);

		if (!isAllowed) {
			throw new BadRequestException(`Path "${path}" is not allowed`);
		}

		const resume = await this.prisma.resume.findFirst({ where: { id, uid } });
		if (!resume) {
			throw new NotFoundException(`Resume with id ${id} not found`);
		}

		if (path.startsWith('data.')) {
			const data = (resume.data ?? {}) as Record<string, unknown>;
			setNestedValue(data, path.slice(5), value);
			this.ensureEmbeddedUids(data as ResumeContent, uid);
			const result = await this.prisma.resume.update({ where: { id }, data: { data } });

			return {
				...result,
				_id: result.id,
				data: result.data as ResumeContent,
			} as ResumeWithId;
		}

		const result = await this.prisma.resume.update({ where: { id }, data: { [path]: value } });

		return { ...result, _id: result.id, data: result.data as ResumeContent } as ResumeWithId;
	}

	async addCollectionItem(
		uid: string,
		id: string,
		collection: ResumeCollection,
	): Promise<ResumeWithId> {
		const resume = await this.prisma.resume.findFirst({ where: { id, uid } });
		if (!resume) {
			throw new NotFoundException(`Resume with id ${id} not found`);
		}

		const data = (resume.data ?? {}) as ResumeContent;

		switch (collection) {
			case ResumeCollection.WORK_EXPERIENCE:
				(data.workExperience ??= []).push(this.createJob(uid, { position: 'New Role' }));
				break;
			case ResumeCollection.PROJECTS:
				(data.projects ??= []).push(this.createProject(uid, { name: 'New Project' }));
				break;
			case ResumeCollection.VOLUNTEERING:
				(data.volunteering ??= []).push(
					this.createVolunteering(uid, { position: 'New Role' }),
				);
				break;
			default:
				throw new BadRequestException(`Collection "${collection}" is not supported`);
		}

		this.ensureEmbeddedUids(data, uid);
		const result = await this.prisma.resume.update({
			where: { id },
			data: { data: data as object },
		});

		return { ...result, _id: result.id, data: result.data as ResumeContent } as ResumeWithId;
	}

	async removeCollectionItem(
		uid: string,
		id: string,
		collection: ResumeCollection,
		index: number,
	): Promise<ResumeWithId> {
		const resume = await this.prisma.resume.findFirst({ where: { id, uid } });
		if (!resume) {
			throw new NotFoundException(`Resume with id ${id} not found`);
		}

		const data = (resume.data ?? {}) as ResumeContent;
		const items = this.getCollectionItems(data, collection);

		if (index < 0 || index >= items.length) {
			throw new BadRequestException(
				`Index ${index} is out of bounds for collection "${collection}"`,
			);
		}

		items.splice(index, 1);
		this.ensureEmbeddedUids(data, uid);
		const result = await this.prisma.resume.update({
			where: { id },
			data: { data: data as object },
		});

		return { ...result, _id: result.id, data: result.data as ResumeContent } as ResumeWithId;
	}

	private ensureEmbeddedUids(data: ResumeContent, uid: string) {
		this.ensureCollectionItemUids(data.education, uid);
		this.ensureCollectionItemUids(data.skills, uid);
		this.ensureCollectionItemUids(data.skillGroups, uid);
		this.ensureCollectionItemUids(data.workExperience, uid);
		this.ensureCollectionItemUids(data.projects, uid);
		this.ensureCollectionItemUids(data.volunteering, uid);
	}

	private ensureCollectionItemUids(items: Array<{ uid?: string }> | undefined, uid: string) {
		items?.forEach((item) => {
			if (!item.uid) {
				item.uid = uid;
			}
		});
	}

	private getCollectionItems(
		data: ResumeContent,
		collection: ResumeCollection,
	): Job[] | Project[] | Volunteering[] {
		switch (collection) {
			case ResumeCollection.WORK_EXPERIENCE:
				return (data.workExperience ??= []);
			case ResumeCollection.PROJECTS:
				return (data.projects ??= []);
			case ResumeCollection.VOLUNTEERING:
				return (data.volunteering ??= []);
			default:
				throw new BadRequestException(`Collection "${collection}" is not supported`);
		}
	}

	private createJob(uid: string, overrides: Partial<Job> = {}): Job {
		return {
			_id: crypto.randomUUID(),
			uid,
			company: '',
			position: '',
			location: '',
			startDate: '',
			endDate: undefined,
			responsibilities: [],
			relevance: undefined,
			...overrides,
		} as unknown as Job;
	}

	private createProject(uid: string, overrides: Partial<Project> = {}): Project {
		return {
			_id: crypto.randomUUID(),
			uid,
			name: '',
			technologies: [],
			items: [],
			type: undefined,
			relevance: undefined,
			...overrides,
		} as unknown as Project;
	}

	private createVolunteering(uid: string, overrides: Partial<Volunteering> = {}): Volunteering {
		return {
			_id: crypto.randomUUID(),
			uid,
			organization: undefined,
			position: '',
			location: undefined,
			startDate: '',
			endDate: undefined,
			responsibilities: [],
			relevance: undefined,
			...overrides,
		} as unknown as Volunteering;
	}
}
