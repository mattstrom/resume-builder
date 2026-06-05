import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ProfilesModule } from '../../entities/profiles/profiles.module.js';
import { LlmModule } from '../../llm/llm.module.js';
import { QUEUES } from '../queues.js';
import { ProfileNarrativeSummaryCompletedEventHandler } from './profile-summarizer-completed.event-handler.js';
import { ProfileNarrativeSummaryCommandHandler } from './profile-summarizer.command-handler.js';
import { ProfileNarrativeSummaryProcessor } from './profile-summarizer.processor.js';

const isProd = process.env.NODE_ENV === 'production';

@Module({
	imports: [
		ProfilesModule,
		LlmModule,
		BullModule.registerQueue({ name: QUEUES.PROFILE_NARRATIVE_SUMMARY }),
		...(isProd
			? []
			: [
					BullBoardModule.forFeature({
						name: QUEUES.PROFILE_NARRATIVE_SUMMARY,
						adapter: BullMQAdapter,
					}),
				]),
	],
	providers: [
		ProfileNarrativeSummaryCommandHandler,
		ProfileNarrativeSummaryProcessor,
		ProfileNarrativeSummaryCompletedEventHandler,
	],
})
export class ProfileSummarizerModule {}
