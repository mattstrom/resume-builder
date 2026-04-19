import {
	Field,
	Mutation,
	ObjectType,
	Args,
	Query,
	Resolver,
} from '@nestjs/graphql';
import { CommandBus } from '@nestjs/cqrs';
import { Profile, ProfileUpdateInput } from '@resume-builder/entities';
import { CurrentUser } from '../../auth';
import { ProfilesService } from './profiles.service';
import { ProfileNarrativeSummaryCommand } from '../../queue/profile-summarizer/profile-summarizer.command';

@ObjectType()
class GenerateNarrativeSummaryResult {
	@Field()
	jobId: string;
}

@Resolver(() => Profile)
export class ProfileResolver {
	constructor(
		private readonly profilesService: ProfilesService,
		private readonly commandBus: CommandBus,
	) {}

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

	@Mutation(() => GenerateNarrativeSummaryResult)
	async generateNarrativeSummary(
		@CurrentUser('sub') uid: string,
	): Promise<GenerateNarrativeSummaryResult> {
		return this.commandBus.execute(new ProfileNarrativeSummaryCommand(uid));
	}
}
