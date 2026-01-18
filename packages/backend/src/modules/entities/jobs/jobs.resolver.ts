import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Job, JobInput } from '@resume-builder/entities';
import { JobsService } from './jobs.service';

@Resolver(() => Job)
export class JobsResolver {
	constructor(private readonly jobsService: JobsService) {}

	@Query(() => [Job])
	async listJobs(): Promise<Job[]> {
		return this.jobsService.findAll();
	}
}
