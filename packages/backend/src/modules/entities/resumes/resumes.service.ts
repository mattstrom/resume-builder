import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
	BlankResumeCreateInput,
	ContactInformation,
	Job,
	Project,
	Resume,
	ResumeCollection,
	ResumeCreateInput,
	ResumeDocument,
	ResumeFilterInput,
	ResumeSortBy,
	ResumeSortInput,
	ResumeUpdateInput,
	Volunteering,
} from '@resume-builder/entities';
import { Model, SortOrder, UpdateOneModel } from 'mongoose';

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

@Injectable()
export class ResumesService {
	constructor(
		@InjectModel(Resume.name) private readonly resumeModel: Model<Resume>,
		@InjectModel(ContactInformation.name)
		private readonly contactInfoModel: Model<ContactInformation>,
		@InjectModel(Job.name) private readonly jobModel: Model<Job>,
		@InjectModel(Project.name)
		private readonly projectModel: Model<Project>,
		@InjectModel(Volunteering.name)
		private readonly volunteeringModel: Model<Volunteering>,
	) {}

	async findAll(
		uid: string,
		sort?: ResumeSortInput,
		filter?: ResumeFilterInput,
	): Promise<Resume[]> {
		const query: Record<string, unknown> = { uid };

		if (filter?.base !== undefined) {
			query['base'] = filter.base;
		}
		if (filter?.company) {
			query['company'] = { $regex: filter.company, $options: 'i' };
		}
		if (filter?.applicationId) {
			query['applicationId'] = filter.applicationId;
		}

		const sortCriteria: Record<string, SortOrder> = {};

		if (sort) {
			const fieldMap: Record<ResumeSortBy, string> = {
				[ResumeSortBy.COMPANY]: 'company',
				[ResumeSortBy.LEVEL]: 'level',
				[ResumeSortBy.DATE]: 'createdAt',
			};
			const direction: SortOrder = sort.ascending ? 1 : -1;
			sortCriteria[fieldMap[sort.field]] = direction;
		}

		sortCriteria['name'] = 1;

		const results = await this.resumeModel
			.find(query)
			.sort(sortCriteria)
			.exec();

		return results.map((item) => item.toObject());
	}

	async find(uid: string, id: string): Promise<Resume | null> {
		const result = await this.resumeModel.findOne({ _id: id, uid }).exec();

		if (!result) {
			throw new NotFoundException();
		}

		return result?.toObject() ?? null;
	}

	async create(uid: string, resumeData: ResumeCreateInput): Promise<Resume> {
		const created = new this.resumeModel({ ...resumeData, uid });
		const saved = await created.save();
		return saved.toObject();
	}

	async createBlank(
		uid: string,
		resumeData: BlankResumeCreateInput,
	): Promise<Resume> {
		const contactInfo = await this.contactInfoModel.findOne({}).exec();

		if (!contactInfo) {
			throw new NotFoundException('Contact information not found');
		}

		const created = new this.resumeModel({
			...resumeData,
			uid,
			data: {
				contactInformation: contactInfo,
			},
		});

		const saved = await created.save();
		return saved.toObject();
	}

	async update(
		uid: string,
		id: string,
		updateData: ResumeUpdateInput,
	): Promise<Resume> {
		const updated = await this.resumeModel
			.findOneAndUpdate({ _id: id, uid }, updateData, { new: true })
			.exec();

		if (!updated) {
			throw new NotFoundException(`Resume with id ${id} not found`);
		}

		return updated.toObject();
	}

	async patch(
		uid: string,
		id: string,
		update: UpdateOneModel<Resume>,
	): Promise<Resume> {
		const resume = await this.getResumeModel(id, uid);

		if (!resume) {
			throw new NotFoundException(`Resume with id ${id} not found`);
		}

		// else if (resume.readOnly) {
		// 	throw new ForbiddenException(`Resume with id ${id} is read-only`);
		// }

		const result = resume.set(update);
		await result.save();

		return result;
	}

	private async getResumeModel(id: string, uid: string) {
		const result = await this.resumeModel.findOne({ _id: id, uid }).exec();

		if (!result) {
			throw new NotFoundException();
		}

		return result;
	}

	async setField(
		uid: string,
		id: string,
		path: string,
		value: unknown,
	): Promise<Resume> {
		const isAllowed = ALLOWED_PATH_PREFIXES.some(
			(prefix) => path === prefix || path.startsWith(prefix + '.'),
		);

		if (!isAllowed) {
			throw new BadRequestException(`Path "${path}" is not allowed`);
		}

		const resume = await this.resumeModel.findOne({ _id: id, uid }).exec();

		if (!resume) {
			throw new NotFoundException(`Resume with id ${id} not found`);
		}

		resume.set(path, value);
		this.ensureEmbeddedUids(resume, uid);

		const saved = await resume.save();
		return saved.toObject();
	}

	async addCollectionItem(
		uid: string,
		id: string,
		collection: ResumeCollection,
	): Promise<Resume> {
		const resume = await this.resumeModel.findOne({ _id: id, uid }).exec();

		if (!resume) {
			throw new NotFoundException(`Resume with id ${id} not found`);
		}

		switch (collection) {
			case ResumeCollection.WORK_EXPERIENCE:
				resume.data.workExperience.push(
					this.createJob(uid, {
						position: 'New Role',
					}),
				);
				break;
			case ResumeCollection.PROJECTS:
				resume.data.projects.push(
					this.createProject(uid, {
						name: 'New Project',
					}),
				);
				break;
			case ResumeCollection.VOLUNTEERING:
				if (!resume.data.volunteering) {
					resume.data.volunteering = [];
				}
				resume.data.volunteering.push(
					this.createVolunteering(uid, {
						position: 'New Role',
					}),
				);
				break;
			default:
				throw new BadRequestException(
					`Collection "${collection}" is not supported`,
				);
		}

		this.ensureEmbeddedUids(resume, uid);
		const saved = await resume.save();
		return saved.toObject();
	}

	async removeCollectionItem(
		uid: string,
		id: string,
		collection: ResumeCollection,
		index: number,
	): Promise<Resume> {
		const resume = await this.resumeModel.findOne({ _id: id, uid }).exec();

		if (!resume) {
			throw new NotFoundException(`Resume with id ${id} not found`);
		}

		const items = this.getCollectionItems(resume, collection);

		if (index < 0 || index >= items.length) {
			throw new BadRequestException(
				`Index ${index} is out of bounds for collection "${collection}"`,
			);
		}

		items.splice(index, 1);

		this.ensureEmbeddedUids(resume, uid);
		const saved = await resume.save();
		return saved.toObject();
	}

	private ensureEmbeddedUids(resume: ResumeDocument, uid: string) {
		const { data } = resume;

		this.ensureCollectionItemUids(data.education, uid);
		this.ensureCollectionItemUids(data.skills, uid);
		this.ensureCollectionItemUids(data.skillGroups, uid);
		this.ensureCollectionItemUids(data.workExperience, uid);
		this.ensureCollectionItemUids(data.projects, uid);
		this.ensureCollectionItemUids(data.volunteering, uid);
	}

	private ensureCollectionItemUids(
		items: Array<{ uid?: string }> | undefined,
		uid: string,
	) {
		items?.forEach((item) => {
			if (!item.uid) {
				item.uid = uid;
			}
		});
	}

	private getCollectionItems(
		resume: ResumeDocument,
		collection: ResumeCollection,
	): Job[] | Project[] | Volunteering[] {
		switch (collection) {
			case ResumeCollection.WORK_EXPERIENCE:
				return resume.data.workExperience;
			case ResumeCollection.PROJECTS:
				return resume.data.projects;
			case ResumeCollection.VOLUNTEERING:
				if (!resume.data.volunteering) {
					resume.data.volunteering = [];
				}
				return resume.data.volunteering;
			default:
				throw new BadRequestException(
					`Collection "${collection}" is not supported`,
				);
		}
	}

	private createJob(uid: string, overrides: Partial<Job> = {}): Job {
		return new this.jobModel({
			uid,
			...overrides,
		}).toObject();
	}

	private createProject(
		uid: string,
		overrides: Partial<Project> = {},
	): Project {
		return new this.projectModel({
			uid,
			...overrides,
		}).toObject();
	}

	private createVolunteering(
		uid: string,
		overrides: Partial<Volunteering> = {},
	): Volunteering {
		return new this.volunteeringModel({
			uid,
			...overrides,
		}).toObject();
	}
}
