import { Module } from '@nestjs/common';

import { EducationsController } from './educations.controller.js';
import { EducationsResolver } from './educations.resolver.js';
import { EducationsService } from './educations.service.js';

@Module({
	controllers: [EducationsController],
	providers: [EducationsService, EducationsResolver],
	exports: [EducationsService],
})
export class EducationsModule {}
