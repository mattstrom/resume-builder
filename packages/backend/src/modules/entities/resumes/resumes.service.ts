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
}
