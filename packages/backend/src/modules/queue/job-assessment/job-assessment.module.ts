import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ApplicationsModule } from '../../entities/applications/applications.module.js';
import { ProfilesModule } from '../../entities/profiles/profiles.module.js';
import { LlmModule } from '../../llm/llm.module.js';
import { QUEUES } from '../queues.js';
import { JobAssessmentCompletedEventHandler } from './job-assessment-completed.event-handler.js';
import { JobAssessmentCommandHandler } from './job-assessment.command-handler.js';
import { JobAssessmentProcessor } from './job-assessment.processor.js';

const isProd = process.env.NODE_ENV === 'production';

@Module({
	imports: [
		ApplicationsModule,
		ProfilesModule,
		LlmModule,
		BullModule.registerQueue({ name: QUEUES.JOB_ASSESSMENT }),
		...(isProd
			? []
			: [
					BullBoardModule.forFeature({
						name: QUEUES.JOB_ASSESSMENT,
						adapter: BullMQAdapter,
					}),
				]),
	],
	providers: [
		JobAssessmentCommandHandler,
		JobAssessmentProcessor,
		JobAssessmentCompletedEventHandler,
	],
})
export class JobAssessmentModule {}
