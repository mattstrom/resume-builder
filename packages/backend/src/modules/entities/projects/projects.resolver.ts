import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Project, ProjectInput } from '@resume-builder/entities';
import { ProjectsService } from './projects.service';

@Resolver(() => Project)
export class ProjectsResolver {
	constructor(private readonly projectsService: ProjectsService) {}

	@Query(() => [Project])
	async listProjects(): Promise<Project[]> {
		return this.projectsService.findAll();
	}

	@Query(() => Project)
	async findProject(@Args('id') id: string): Promise<Project | null> {
		return this.projectsService.find(id);
	}

	@Mutation(() => Project)
	async createProject(@Args('project') project: ProjectInput) {
		return this.projectsService.create(project);
	}
}
