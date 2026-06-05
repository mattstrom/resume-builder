import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Resume, ResumeSchema } from '@resume-builder/entities';

import { MongodbModule } from '../../mongodb/mongodb.module.js';
import { ResumeResolver } from './resume.resolver.js';
import { ResumesService } from './resumes.service.js';

@Module({
	imports: [
		MongodbModule,
		MongooseModule.forFeature([{ name: Resume.name, schema: ResumeSchema }]),
	],
	providers: [ResumeResolver, ResumesService],
	exports: [ResumesService],
})
export class ResumesModule {}
