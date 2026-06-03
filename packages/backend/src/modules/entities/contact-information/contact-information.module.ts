import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContactInformation, ContactInformationSchema } from '@resume-builder/entities';

import { ContactInformationController } from './contact-information.controller.js';
import { ContactInformationResolver } from './contact-information.resolver.js';
import { ContactInformationService } from './contact-information.service.js';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: ContactInformation.name, schema: ContactInformationSchema },
		]),
	],
	controllers: [ContactInformationController],
	providers: [ContactInformationService, ContactInformationResolver],
	exports: [ContactInformationService],
})
export class ContactInformationModule {}
