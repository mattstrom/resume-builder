import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Application, ApplicationSchema } from '@resume-builder/entities';

import { MongodbModule } from '../../mongodb/mongodb.module.js';
import { ResumesModule } from '../resumes/resumes.module.js';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsResolver } from './applications.resolver.js';
import { ApplicationsService } from './applications.service.js';

@Module({
	imports: [
		ResumesModule,
		MongodbModule,
		MongooseModule.forFeature([{ name: Application.name, schema: ApplicationSchema }]),
	],
	controllers: [ApplicationsController],
	providers: [ApplicationsResolver, ApplicationsService],
	exports: [ApplicationsService],
})
export class ApplicationsModule {}
