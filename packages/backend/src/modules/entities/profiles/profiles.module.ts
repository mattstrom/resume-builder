import { Module } from '@nestjs/common';

import { ProfileResolver } from './profile.resolver.js';
import { ProfilesService } from './profiles.service.js';

@Module({
	providers: [ProfileResolver, ProfilesService],
	exports: [ProfilesService],
})
export class ProfilesModule {}
