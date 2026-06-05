import { Module } from '@nestjs/common';

import { ContactInformationController } from './contact-information.controller.js';
import { ContactInformationResolver } from './contact-information.resolver.js';
import { ContactInformationService } from './contact-information.service.js';

@Module({
	controllers: [ContactInformationController],
	providers: [ContactInformationService, ContactInformationResolver],
	exports: [ContactInformationService],
})
export class ContactInformationModule {}
