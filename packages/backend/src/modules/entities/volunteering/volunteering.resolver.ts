import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Volunteering, VolunteeringInput } from '@resume-builder/entities';
import { CurrentUser } from '../../auth';
import { VolunteeringService } from './volunteering.service';

@Resolver(() => Volunteering)
export class VolunteeringResolver {
	constructor(private readonly volunteeringService: VolunteeringService) {}

	@Query(() => [Volunteering])
	async listVolunteering(
		@CurrentUser('sub') uid: string,
	): Promise<Volunteering[]> {
		return this.volunteeringService.findAll(uid);
	}

	@Mutation(() => Volunteering)
	async createVolunteering(
		@CurrentUser('sub') uid: string,
		@Args('volunteering') volunteeringInput: VolunteeringInput,
	): Promise<Volunteering> {
		return this.volunteeringService.create(uid, volunteeringInput);
	}
}
