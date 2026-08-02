import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { Global, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { BullConnectionModule } from './bull-connection.module.js';
import { EmbeddingsModule } from './embeddings/embeddings.module.js';
import { ExamplesModule } from './examples/examples.module.js';
import { JobAssessmentModule } from './job-assessment/job-assessment.module.js';
import { ProfileSummarizerModule } from './profile-summarizer/profile-summarizer.module.js';
import { QUEUES } from './queues.js';

const isProd = process.env.NODE_ENV === 'production';

@Global()
@Module({
	imports: [
		CqrsModule,
		BullConnectionModule,
		...(isProd
			? []
			: [
					BullBoardModule.forRoot({
						route: '/admin/queues',
						adapter: ExpressAdapter,
					}),
					BullBoardModule.forFeature({
						name: QUEUES.EMBEDDINGS,
						adapter: BullMQAdapter,
					}),
				]),
		ExamplesModule,
		EmbeddingsModule,
		JobAssessmentModule,
		ProfileSummarizerModule,
	],
	exports: [CqrsModule, BullConnectionModule],
})
export class QueueModule {}
