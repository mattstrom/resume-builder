import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Profile, ProfileSchema } from '@resume-builder/entities';

import { MongodbModule } from '../../mongodb/mongodb.module.js';
import { ProfileResolver } from './profile.resolver.js';
import { ProfilesService } from './profiles.service.js';

@Module({
	imports: [
		MongodbModule,
		MongooseModule.forFeature([{ name: Profile.name, schema: ProfileSchema }]),
	],
	providers: [ProfileResolver, ProfilesService],
	exports: [ProfilesService],
})
export class ProfilesModule {}
