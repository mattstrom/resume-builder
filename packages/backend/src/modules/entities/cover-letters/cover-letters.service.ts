import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
	CoverLetter,
	CoverLetterInput,
	CoverLetterUpdateInput,
} from '@resume-builder/entities';
import { Model, UpdateOneModel } from 'mongoose';

@Injectable()
export class CoverLettersService {
	constructor(
		@InjectModel(CoverLetter.name)
		private readonly coverLetterModel: Model<CoverLetter>,
	) {}

	async findAll(): Promise<CoverLetter[]> {
		const results = await this.coverLetterModel.find().exec();
		return results.map((item) => item.toObject());
	}

	async find(id: string): Promise<CoverLetter | null> {
		const result = await this.coverLetterModel.findById(id).exec();

		if (!result) {
			throw new NotFoundException();
		}

		return result?.toObject() ?? null;
	}

	async create(coverLetterData: CoverLetterInput): Promise<CoverLetter> {
		const created = new this.coverLetterModel(coverLetterData);
		const saved = await created.save();
		return saved.toObject();
	}

	async update(
		id: string,
		updateData: CoverLetterUpdateInput,
	): Promise<CoverLetter> {
		const updated = await this.coverLetterModel
			.findByIdAndUpdate(id, updateData, { new: true })
			.exec();

		if (!updated) {
			throw new NotFoundException(`Cover letter with id ${id} not found`);
		}

		return updated.toObject();
	}

	async patch(
		id: string,
		update: UpdateOneModel<CoverLetter>,
	): Promise<void> {
		const result = await this.coverLetterModel
			.updateOne({ _id: id }, update)
			.exec();
	}
}
