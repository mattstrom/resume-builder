import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Resume, ResumeSchema } from '@resume-builder/entities';

import { MongodbModule } from '../../mongodb/mongodb.module';
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
	providers: [ResumesService],
	exports: [ResumesService],
})
export class ResumesModule {}
