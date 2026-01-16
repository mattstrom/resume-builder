import { Controller, Get } from '@nestjs/common';
import { ContactInformationService } from './contact-information.service';

@Controller('contact-information')
export class ContactInformationController {
	constructor(
		private readonly contactInformationService: ContactInformationService,
	) {}

	@Get()
	findAll() {
		return this.contactInformationService.findAll();
	}
}
