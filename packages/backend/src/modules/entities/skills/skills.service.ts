import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Skill } from '@resume-builder/entities';
import { Model } from 'mongoose';

@Injectable()
export class SkillsService {
	constructor(
		@InjectModel(Skill.name) private readonly skillModel: Model<Skill>,
	) {}

	async findAll(uid: string, categories?: string[]) {
		const query =
			categories && categories.length > 0
				? { category: { $in: categories } }
				: {};

		return this.skillModel
			.find({ ...query, uid })
			.lean()
			.exec();
	}
}
