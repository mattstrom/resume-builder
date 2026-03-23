import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../auth';
import { ContactInformationService } from './contact-information.service';

@Controller('contact-information')
export class ContactInformationController {
	constructor(
		private readonly contactInformationService: ContactInformationService,
	) {}

	@Get()
	findAll(@CurrentUser('sub') uid: string) {
		return this.contactInformationService.findAll(uid);
	}
}
