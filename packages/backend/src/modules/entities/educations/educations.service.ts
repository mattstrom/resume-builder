import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Education as Education } from '@resume-builder/entities';
import { Model } from 'mongoose';

@Injectable()
export class EducationsService {
	constructor(
		@InjectModel(Education.name)
		private readonly educationModel: Model<Education>,
	) {}

	async findAll() {
		return this.educationModel.find().exec();
	}
}
