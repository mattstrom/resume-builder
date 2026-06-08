import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Job, JobInput } from '@resume-builder/entities';

import { CurrentUser } from '../../auth/index.js';
import { JobsService } from './jobs.service.js';

@Resolver(() => Job)
export class JobsResolver {
	constructor(private readonly jobsService: JobsService) {}

	@Query(() => [Job])
	async listJobs(@CurrentUser('sub') uid: string): Promise<Job[]> {
		return this.jobsService.findAll(uid);
	}

	@Mutation(() => Job)
	async createJob(@CurrentUser('sub') uid: string, @Args('job') job: JobInput): Promise<Job> {
		return this.jobsService.create(uid, job);
	}

	@Mutation(() => Job)
	async updateJob(
		@CurrentUser('sub') uid: string,
		@Args('id') id: string,
		@Args('job') job: JobInput,
	): Promise<Job> {
		return this.jobsService.update(uid, id, job);
	}

	@Mutation(() => Boolean)
	async deleteJob(@CurrentUser('sub') uid: string, @Args('id') id: string): Promise<boolean> {
		await this.jobsService.delete(uid, id);

		return true;
	}
}
