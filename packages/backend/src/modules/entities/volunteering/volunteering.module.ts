import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Volunteering, VolunteeringSchema } from '@resume-builder/entities';

import { VolunteeringResolver } from './volunteering.resolver';
import { VolunteeringService } from './volunteering.service';

@Module({
	imports: [MongooseModule.forFeature([{ name: Volunteering.name, schema: VolunteeringSchema }])],
	providers: [VolunteeringResolver, VolunteeringService],
	exports: [VolunteeringService],
})
export class VolunteeringModule {}
