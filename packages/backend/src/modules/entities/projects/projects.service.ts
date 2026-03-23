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

	async findAll(uid: string) {
		return this.projectModel.find({ uid }).exec();
	}

	async find(uid: string, id: string): Promise<Project | null> {
		return this.projectModel.findOne({ _id: id, uid }).exec();
	}

	async create(uid: string, projectData: ProjectInput): Promise<Project> {
		return this.projectModel.create({ ...projectData, uid });
	}
}
