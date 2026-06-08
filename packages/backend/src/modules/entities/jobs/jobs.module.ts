import { Module } from '@nestjs/common';

import { JobsResolver } from './jobs.resolver.js';
import { JobsService } from './jobs.service.js';

@Module({
	providers: [JobsService, JobsResolver],
	exports: [JobsService],
})
export class JobsModule {}
