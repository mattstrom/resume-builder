import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
	BlankResumeCreateInput,
	Resume,
	ResumeCreateInput,
	ResumeFilterInput,
	ResumeSortInput,
} from '@resume-builder/entities';

import { CurrentUser } from '../../auth/index.js';
import { ResumesService } from './resumes.service.js';

@Resolver(() => Resume)
export class ResumeResolver {
	constructor(private readonly resumesService: ResumesService) {}

	@Query(() => [Resume])
	async listResumes(
		@CurrentUser('sub') uid: string,
		@Args('sort', { type: () => ResumeSortInput, nullable: true })
		sort?: ResumeSortInput,
		@Args('filter', { type: () => ResumeFilterInput, nullable: true })
		filter?: ResumeFilterInput,
	) {
		return this.resumesService.findAll(uid, sort, filter);
	}

	@Query(() => Resume)
	async getResume(@CurrentUser('sub') uid: string, @Args('id') id: string) {
		return this.resumesService.find(uid, id);
	}

	@Mutation(() => Resume)
	async createResume(
		@CurrentUser('sub') uid: string,
		@Args('resumeData') resumeData: ResumeCreateInput,
	) {
		return this.resumesService.create(uid, resumeData);
	}

	@Mutation(() => Resume)
	async createBlankResume(
		@CurrentUser('sub') uid: string,
		@Args('resumeData') resumeData: BlankResumeCreateInput,
	) {
		return this.resumesService.createBlank(uid, resumeData);
	}
}
