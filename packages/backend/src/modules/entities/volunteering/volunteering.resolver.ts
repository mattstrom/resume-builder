import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Volunteering, VolunteeringInput } from '@resume-builder/entities';
import { VolunteeringService } from './volunteering.service';

@Resolver(() => Volunteering)
export class VolunteeringResolver {
	constructor(private readonly volunteeringService: VolunteeringService) {}

	@Query(() => [Volunteering])
	async listVolunteering(): Promise<Volunteering[]> {
		return this.volunteeringService.findAll();
	}

	@Mutation(() => Volunteering)
	async createVolunteering(
		@Args('volunteering') volunteeringInput: VolunteeringInput,
	): Promise<Volunteering> {
		return this.volunteeringService.create(volunteeringInput);
	}
}
