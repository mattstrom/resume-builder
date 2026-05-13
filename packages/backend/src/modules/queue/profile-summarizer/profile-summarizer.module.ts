import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ProfilesModule } from '../../entities/profiles/profiles.module';
import { LlmModule } from '../../llm/llm.module';
import { QUEUES } from '../queues';
import { ProfileNarrativeSummaryCompletedEventHandler } from './profile-summarizer-completed.event-handler';
import { ProfileNarrativeSummaryCommandHandler } from './profile-summarizer.command-handler';
import { ProfileNarrativeSummaryProcessor } from './profile-summarizer.processor';

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
