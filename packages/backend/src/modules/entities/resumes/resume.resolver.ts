import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
	Resume,
	ResumeCreateInput,
	ResumeUpdateInput,
} from '@resume-builder/entities';
import { ResumesService } from './resumes.service';

@Resolver(() => Resume)
export class ResumeResolver {
	constructor(private readonly resumesService: ResumesService) {}

	@Query(() => [Resume])
	async listResumes() {
		return this.resumesService.findAll();
	}

	@Query(() => Resume)
	async getResume(@Args('id') id: string) {
		return this.resumesService.find(id);
	}

	@Mutation(() => Resume)
	async createResume(@Args('resumeData') resumeData: ResumeCreateInput) {
		return this.resumesService.create(resumeData);
	}

	@Mutation(() => Resume)
	async updateResume(
		@Args('id') id: string,
		@Args('resumeData') resumeData: ResumeUpdateInput,
	) {
		return this.resumesService.update(id, resumeData);
	}
}
