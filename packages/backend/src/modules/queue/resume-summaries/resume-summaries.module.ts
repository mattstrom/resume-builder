import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ResumesModule } from '../../entities/resumes/resumes.module.js';
import { QUEUES } from '../queues.js';
import { EmbeddingsModule } from '../embeddings/embeddings.module.js';
import { MastraResumeSummarizerService } from './mastra-resume-summarizer.service.js';
import { ResumeSummaryDocumentsService } from './resume-summary-documents.service.js';
import { ResumeSummaryQueueService } from './resume-summary-queue.service.js';
import { ResumeSummaryProcessor } from './resume-summary.processor.js';

const isProd = process.env.NODE_ENV === 'production';

@Module({
	imports: [
		ResumesModule,
		EmbeddingsModule,
		BullModule.registerQueue({ name: QUEUES.RESUME_SUMMARIES }),
		...(isProd
			? []
			: [
					BullBoardModule.forFeature({
						name: QUEUES.RESUME_SUMMARIES,
						adapter: BullMQAdapter,
					}),
				]),
	],
	providers: [
		MastraResumeSummarizerService,
		ResumeSummaryDocumentsService,
		ResumeSummaryQueueService,
		ResumeSummaryProcessor,
	],
	exports: [ResumeSummaryQueueService],
})
export class ResumeSummariesModule {}
