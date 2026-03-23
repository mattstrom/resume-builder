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

	async findAll(uid: string): Promise<CoverLetter[]> {
		const results = await this.coverLetterModel.find({ uid }).exec();
		return results.map((item) => item.toObject());
	}

	async find(uid: string, id: string): Promise<CoverLetter | null> {
		const result = await this.coverLetterModel
			.findOne({ _id: id, uid })
			.exec();

		if (!result) {
			throw new NotFoundException();
		}

		return result?.toObject() ?? null;
	}

	async create(
		uid: string,
		coverLetterData: CoverLetterInput,
	): Promise<CoverLetter> {
		const created = new this.coverLetterModel({
			...coverLetterData,
			uid,
		});
		const saved = await created.save();
		return saved.toObject();
	}

	async update(
		uid: string,
		id: string,
		updateData: CoverLetterUpdateInput,
	): Promise<CoverLetter> {
		const updated = await this.coverLetterModel
			.findOneAndUpdate({ _id: id, uid }, updateData, { new: true })
			.exec();

		if (!updated) {
			throw new NotFoundException(`Cover letter with id ${id} not found`);
		}

		return updated.toObject();
	}

	async patch(
		uid: string,
		id: string,
		update: UpdateOneModel<CoverLetter>,
	): Promise<void> {
		const result = await this.coverLetterModel
			.updateOne({ _id: id, uid }, update)
			.exec();
	}
}
