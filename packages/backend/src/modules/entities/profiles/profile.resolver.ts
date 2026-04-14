import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Profile, ProfileUpdateInput } from '@resume-builder/entities';
import { CurrentUser } from '../../auth';
import { ProfilesService } from './profiles.service';

@Resolver(() => Profile)
export class ProfileResolver {
	constructor(private readonly profilesService: ProfilesService) {}

	@Query(() => Profile, { nullable: true })
	async getProfile(@CurrentUser('sub') uid: string) {
		return this.profilesService.findOne(uid);
	}

	@Mutation(() => Profile)
	async updateProfile(
		@CurrentUser('sub') uid: string,
		@Args('input', { type: () => ProfileUpdateInput })
		input: ProfileUpdateInput,
	) {
		return this.profilesService.upsert(uid, input);
	}
}
