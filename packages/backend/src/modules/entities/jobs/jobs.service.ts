import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from '@resume-builder/entities';
import { Model } from 'mongoose';

@Injectable()
export class JobsService {
	constructor(@InjectModel(Job.name) private readonly jobModel: Model<Job>) {}

	async findAll() {
		return this.jobModel.find().exec();
	}
}
