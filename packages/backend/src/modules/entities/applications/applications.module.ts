import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Application, ApplicationSchema } from '@resume-builder/entities';

import { MongodbModule } from '../../mongodb/mongodb.module';
import { ResumesModule } from '../resumes/resumes.module';
import { ApplicationsController } from './applications.controller';
import { ApplicationsResolver } from './applications.resolver';
import { ApplicationsService } from './applications.service';

@Module({
	imports: [
		ResumesModule,
		MongodbModule,
		MongooseModule.forFeature([
			{ name: Application.name, schema: ApplicationSchema },
		]),
	],
	controllers: [ApplicationsController],
	providers: [ApplicationsResolver, ApplicationsService],
	exports: [ApplicationsService],
})
export class ApplicationsModule {}
