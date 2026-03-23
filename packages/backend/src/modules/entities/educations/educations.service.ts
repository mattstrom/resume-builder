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

	async findAll(uid: string): Promise<Education[]> {
		const results = await this.educationModel.find({ uid }).exec();
		return results.map((item) => item.toObject());
	}

	async find(uid: string, id: string): Promise<Education | null> {
		const result = await this.educationModel
			.findOne({ _id: id, uid })
			.exec();
		if (!result) {
			throw new NotFoundException(`Education with id ${id} not found`);
		}
		return result.toObject();
	}

	async create(
		uid: string,
		educationData: EducationInput,
	): Promise<Education> {
		const created = new this.educationModel({ ...educationData, uid });
		const saved = await created.save();
		return saved.toObject();
	}

	async update(
		uid: string,
		id: string,
		educationData: EducationInput,
	): Promise<Education> {
		const updated = await this.educationModel
			.findOneAndUpdate({ _id: id, uid }, educationData, { new: true })
			.exec();

		if (!updated) {
			throw new NotFoundException(`Education with id ${id} not found`);
		}

		return updated.toObject();
	}

	async delete(uid: string, id: string): Promise<void> {
		const result = await this.educationModel
			.findOneAndDelete({ _id: id, uid })
			.exec();
		if (!result) {
			throw new NotFoundException(`Education with id ${id} not found`);
		}
	}
}
