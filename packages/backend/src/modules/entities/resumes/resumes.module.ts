import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Resume, ResumeSchema } from '@resume-builder/entities';

import { MongodbModule } from '../../mongodb/mongodb.module';
import { ResumeResolver } from './resume.resolver';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';

@Module({
	imports: [
		MongodbModule,
		MongooseModule.forFeature([
			{ name: Resume.name, schema: ResumeSchema },
		]),
	],
	controllers: [ResumesController],
	providers: [ResumeResolver, ResumesService],
	exports: [ResumesService],
})
export class ResumesModule {}
