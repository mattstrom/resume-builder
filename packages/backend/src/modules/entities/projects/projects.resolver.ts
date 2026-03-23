import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Project, ProjectInput } from '@resume-builder/entities';
import { CurrentUser } from '../../auth';
import { ProjectsService } from './projects.service';

@Resolver(() => Project)
export class ProjectsResolver {
	constructor(private readonly projectsService: ProjectsService) {}

	@Query(() => [Project])
	async listProjects(@CurrentUser('sub') uid: string): Promise<Project[]> {
		return this.projectsService.findAll(uid);
	}

	@Query(() => Project)
	async findProject(
		@CurrentUser('sub') uid: string,
		@Args('id') id: string,
	): Promise<Project | null> {
		return this.projectsService.find(uid, id);
	}

	@Mutation(() => Project)
	async createProject(
		@CurrentUser('sub') uid: string,
		@Args('project') project: ProjectInput,
	) {
		return this.projectsService.create(uid, project);
	}
}
