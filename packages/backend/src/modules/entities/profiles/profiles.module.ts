import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Profile, ProfileSchema } from '@resume-builder/entities';

import { MongodbModule } from '../../mongodb/mongodb.module';
import { ProfileResolver } from './profile.resolver';
import { ProfilesService } from './profiles.service';

@Module({
	imports: [
		MongodbModule,
		MongooseModule.forFeature([
			{ name: Profile.name, schema: ProfileSchema },
		]),
	],
	providers: [ProfileResolver, ProfilesService],
	exports: [ProfilesService],
})
export class ProfilesModule {}
