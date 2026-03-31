import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
	BlankResumeCreateInput,
	Resume,
	ResumeCreateInput,
	ResumeSortBy,
	ResumeSortInput,
	ResumeUpdateInput,
} from '@resume-builder/entities';
import { Model, SortOrder, UpdateOneModel } from 'mongoose';

@Injectable()
export class ResumesService {
	constructor(
		@InjectModel(Resume.name) private readonly resumeModel: Model<Resume>,
	) {}

	async findAll(uid: string, sort?: ResumeSortInput): Promise<Resume[]> {
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
			.find({ uid })
			// .select({
			// 	name: 1,
			// 	company: 1,
			// 	level: 1,
			// 	tags: 1,
			// })
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
		const created = new this.resumeModel({ ...resumeData, uid });
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
	): Promise<void> {
		const result = await this.resumeModel
			.updateOne({ _id: id, uid }, update)
			.exec();
	}
}
