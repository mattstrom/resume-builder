import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Volunteering, VolunteeringInput } from '@resume-builder/entities';

import { CurrentUser } from '../../auth/index.js';
import { VolunteeringService } from './volunteering.service.js';

@Resolver(() => Volunteering)
export class VolunteeringResolver {
	constructor(private readonly volunteeringService: VolunteeringService) {}

	@Query(() => [Volunteering])
	async listVolunteering(@CurrentUser('sub') uid: string): Promise<Volunteering[]> {
		return this.volunteeringService.findAll(uid);
	}

	@Mutation(() => Volunteering)
	async createVolunteering(
		@CurrentUser('sub') uid: string,
		@Args('volunteering') volunteeringInput: VolunteeringInput,
	): Promise<Volunteering> {
		return this.volunteeringService.create(uid, volunteeringInput);
	}

	@Mutation(() => Volunteering)
	async updateVolunteering(
		@CurrentUser('sub') uid: string,
		@Args('id') id: string,
		@Args('volunteering') volunteeringInput: VolunteeringInput,
	): Promise<Volunteering> {
		return this.volunteeringService.update(uid, id, volunteeringInput);
	}

	@Mutation(() => Boolean)
	async deleteVolunteering(
		@CurrentUser('sub') uid: string,
		@Args('id') id: string,
	): Promise<boolean> {
		await this.volunteeringService.delete(uid, id);
		return true;
	}
}
