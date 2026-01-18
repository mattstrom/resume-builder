import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Project as Project, ProjectInput } from '@resume-builder/entities';
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

	async find(id: string): Promise<Project | null> {
		return this.projectModel.findById(id).exec();
	}

	async create(projectData: ProjectInput): Promise<Project> {
		return this.projectModel.create(projectData);
	}
}
