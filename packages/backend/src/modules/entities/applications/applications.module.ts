import { Module } from '@nestjs/common';

import { CompaniesModule } from '../companies/companies.module.js';
import { ResumesModule } from '../resumes/resumes.module.js';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsResolver } from './applications.resolver.js';
import { ApplicationsService } from './applications.service.js';

@Module({
	imports: [ResumesModule, CompaniesModule],
	controllers: [ApplicationsController],
	providers: [ApplicationsResolver, ApplicationsService],
	exports: [ApplicationsService],
})
export class ApplicationsModule {}
