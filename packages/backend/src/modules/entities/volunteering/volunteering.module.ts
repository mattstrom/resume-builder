import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Volunteering, VolunteeringSchema } from '@resume-builder/entities';

import { VolunteeringResolver } from './volunteering.resolver.js';
import { VolunteeringService } from './volunteering.service.js';

@Module({
	imports: [MongooseModule.forFeature([{ name: Volunteering.name, schema: VolunteeringSchema }])],
	providers: [VolunteeringResolver, VolunteeringService],
	exports: [VolunteeringService],
})
export class VolunteeringModule {}
