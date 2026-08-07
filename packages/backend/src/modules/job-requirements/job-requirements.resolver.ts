import { Args, ID, Query, Resolver } from '@nestjs/graphql';

import { CurrentUser } from '../auth/index.js';
import { JobRequirementType } from './job-requirements.graphql.js';
import { JobRequirementsService } from './job-requirements.service.js';

@Resolver(() => JobRequirementType)
export class JobRequirementsResolver {
	constructor(private readonly jobRequirementsService: JobRequirementsService) {}

	@Query(() => [JobRequirementType])
	async jobRequirements(
		@CurrentUser('sub') uid: string,
		@Args('applicationId', { type: () => ID }) applicationId: string,
	) {
		return this.jobRequirementsService.findByApplication(uid, applicationId);
	}
}
