import { Module } from '@nestjs/common';

import { VolunteeringResolver } from './volunteering.resolver.js';
import { VolunteeringService } from './volunteering.service.js';

@Module({
	providers: [VolunteeringResolver, VolunteeringService],
	exports: [VolunteeringService],
})
export class VolunteeringModule {}
