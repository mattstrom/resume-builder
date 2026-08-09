import { Module } from '@nestjs/common';

import { CompaniesModule } from '../companies/companies.module.js';
import { FlowRunsModule } from '../flow-runs/flow-runs.module.js';
import { ResumesModule } from '../resumes/resumes.module.js';
import { ApplicationsResolver } from './applications.resolver.js';
import { ApplicationsService } from './applications.service.js';

@Module({
	imports: [ResumesModule, CompaniesModule, FlowRunsModule],
	providers: [ApplicationsResolver, ApplicationsService],
	exports: [ApplicationsService],
})
export class ApplicationsModule {}
