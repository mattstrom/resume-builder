import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Volunteering, VolunteeringSchema } from '@resume-builder/entities';
import { VolunteeringService } from './volunteering.service';
import { VolunteeringResolver } from './volunteering.resolver';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: Volunteering.name, schema: VolunteeringSchema },
		]),
	],
	providers: [VolunteeringResolver, VolunteeringService],
	exports: [VolunteeringService],
})
export class VolunteeringModule {}
