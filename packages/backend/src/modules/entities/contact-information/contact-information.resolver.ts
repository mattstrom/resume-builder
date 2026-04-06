import { Query, Resolver } from '@nestjs/graphql';
import { ContactInformation } from '@resume-builder/entities';
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
}
