import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Skill } from '@resume-builder/entities';
import { Model } from 'mongoose';

@Injectable()
export class SkillsService {
	constructor(
		@InjectModel(Skill.name) private readonly skillModel: Model<Skill>,
	) {}

	async findAll(uid: string) {
		return this.skillModel.find({ uid }).exec();
	}
}
