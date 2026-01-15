import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Resume } from '@resume-builder/entities';
import { Model } from 'mongoose';

@Injectable()
export class ResumesService {
	constructor(
		@InjectModel(Resume.name) private readonly resumeModel: Model<Resume>,
	) {}

	async findAll(): Promise<Resume[]> {
		const results = await this.resumeModel.find().exec();
		return results.map((item) => item.toObject());
	}

	async find(id: string): Promise<Resume | null> {
		const result = await this.resumeModel.findById(id).exec();

		if (!result) {
			throw new NotFoundException();
		}

		return result?.toObject() ?? null;
	}

	async create(resumeData: Resume): Promise<Resume> {
		const created = new this.resumeModel(resumeData);
		const saved = await created.save();
		return saved.toObject();
	}

	async update(id: string, updateData: Resume): Promise<Resume> {
		const updated = await this.resumeModel
			.findByIdAndUpdate(id, updateData, { new: true })
			.exec();

		if (!updated) {
			throw new NotFoundException(`Resume with id ${id} not found`);
		}

		return updated.toObject();
	}
}
