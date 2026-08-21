import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/index.js';
import { QUEUES } from '../queues.js';
import { EmbeddingDocumentsService } from './embedding-documents.service.js';
import { EmbeddingQueueService } from './embedding-queue.service.js';
import { EmbeddingService } from './embedding.service.js';
import { EmbeddingProcessor } from './embedding.processor.js';

@Module({
	imports: [
		PrismaModule,
		BullModule.registerQueue({ name: QUEUES.EMBEDDINGS }),
	],
	providers: [
		EmbeddingDocumentsService,
		EmbeddingQueueService,
		EmbeddingService,
		EmbeddingProcessor,
	],
	exports: [EmbeddingDocumentsService, EmbeddingQueueService, EmbeddingService],
})
export class EmbeddingsModule {}
