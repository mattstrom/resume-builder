import { Query, Resolver } from '@nestjs/graphql';
import { Job } from '@resume-builder/entities';
import { CurrentUser } from '../../auth';
import { JobsService } from './jobs.service';

@Resolver(() => Job)
export class JobsResolver {
	constructor(private readonly jobsService: JobsService) {}

	@Query(() => [Job])
	async listJobs(@CurrentUser('sub') uid: string): Promise<Job[]> {
		return this.jobsService.findAll(uid);
	}
}
