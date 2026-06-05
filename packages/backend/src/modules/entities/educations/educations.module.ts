import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Education, EducationSchema } from '@resume-builder/entities';

import { EducationsController } from './educations.controller.js';
import { EducationsResolver } from './educations.resolver.js';
import { EducationsService } from './educations.service.js';

@Module({
	imports: [MongooseModule.forFeature([{ name: Education.name, schema: EducationSchema }])],
	controllers: [EducationsController],
	providers: [EducationsService, EducationsResolver],
	exports: [EducationsService],
})
export class EducationsModule {}
