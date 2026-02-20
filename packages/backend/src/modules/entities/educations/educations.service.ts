import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Education, EducationInput } from '@resume-builder/entities';
import { Model } from 'mongoose';

@Injectable()
export class EducationsService {
	constructor(
		@InjectModel(Education.name)
		private readonly educationModel: Model<Education>,
	) {}

	async findAll(): Promise<Education[]> {
		const results = await this.educationModel.find().exec();
		return results.map((item) => item.toObject());
	}

	async find(id: string): Promise<Education | null> {
		const result = await this.educationModel.findById(id).exec();
		if (!result) {
			throw new NotFoundException(`Education with id ${id} not found`);
		}
		return result.toObject();
	}

	async create(educationData: EducationInput): Promise<Education> {
		const created = new this.educationModel(educationData);
		const saved = await created.save();
		return saved.toObject();
	}

	async update(
		id: string,
		educationData: EducationInput,
	): Promise<Education> {
		const updated = await this.educationModel
			.findByIdAndUpdate(id, educationData, { new: true })
			.exec();

		if (!updated) {
			throw new NotFoundException(`Education with id ${id} not found`);
		}

		return updated.toObject();
	}

	async delete(id: string): Promise<void> {
		const result = await this.educationModel.findByIdAndDelete(id).exec();
		if (!result) {
			throw new NotFoundException(`Education with id ${id} not found`);
		}
	}
}
