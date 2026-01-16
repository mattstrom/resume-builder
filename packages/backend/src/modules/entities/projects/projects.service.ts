import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Project as Project } from '@resume-builder/entities';
import { Model } from 'mongoose';

@Injectable()
export class ProjectsService {
	constructor(
		@InjectModel(Project.name)
		private readonly projectModel: Model<Project>,
	) {}

	async findAll() {
		return this.projectModel.find().exec();
	}
}
