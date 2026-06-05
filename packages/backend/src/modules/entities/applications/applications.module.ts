import { Module } from '@nestjs/common';

import { ResumesModule } from '../resumes/resumes.module.js';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsResolver } from './applications.resolver.js';
import { ApplicationsService } from './applications.service.js';

@Module({
	imports: [ResumesModule],
	controllers: [ApplicationsController],
	providers: [ApplicationsResolver, ApplicationsService],
	exports: [ApplicationsService],
})
export class ApplicationsModule {}
