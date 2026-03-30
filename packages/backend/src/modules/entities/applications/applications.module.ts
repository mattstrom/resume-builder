import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Application, ApplicationSchema } from '@resume-builder/entities';

import { MongodbModule } from '../../mongodb/mongodb.module';
import { ApplicationsResolver } from './applications.resolver';
import { ApplicationsService } from './applications.service';

@Module({
	imports: [
		MongodbModule,
		MongooseModule.forFeature([
			{ name: Application.name, schema: ApplicationSchema },
		]),
	],
	providers: [ApplicationsResolver, ApplicationsService],
	exports: [ApplicationsService],
})
export class ApplicationsModule {}
