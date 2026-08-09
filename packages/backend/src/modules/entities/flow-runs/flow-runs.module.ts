import { Module } from '@nestjs/common';

import { FlowRunsService } from './flow-runs.service.js';

@Module({
	providers: [FlowRunsService],
	exports: [FlowRunsService],
})
export class FlowRunsModule {}
