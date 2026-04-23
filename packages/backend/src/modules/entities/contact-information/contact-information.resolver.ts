import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
	ContactInformation,
	ContactInformationInput,
} from '@resume-builder/entities';
import { CurrentUser } from '../../auth';
import { ContactInformationService } from './contact-information.service';

@Resolver(() => ContactInformation)
export class ContactInformationResolver {
	constructor(
		private readonly contactInformationService: ContactInformationService,
	) {}

	@Query(() => [ContactInformation])
	async listContactInformations(@CurrentUser('sub') uid: string) {
		return this.contactInformationService.findAll(uid);
	}

	@Mutation(() => ContactInformation)
	async upsertContactInformation(
		@CurrentUser('sub') uid: string,
		@Args('input') input: ContactInformationInput,
	) {
		return this.contactInformationService.upsert(uid, input);
	}
}
