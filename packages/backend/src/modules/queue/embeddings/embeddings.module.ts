import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/index.js';
import { QUEUES } from '../queues.js';
import { EmbeddingDocumentsService } from './embedding-documents.service.js';
import { EmbeddingQueueService } from './embedding-queue.service.js';
import { EmbeddingProcessor } from './embedding.processor.js';
import { EmbeddingService } from './embedding.service.js';

@Module({
	imports: [PrismaModule, BullModule.registerQueue({ name: QUEUES.EMBEDDINGS })],
	providers: [
		EmbeddingDocumentsService,
		EmbeddingProcessor,
		EmbeddingQueueService,
		EmbeddingService,
	],
	exports: [EmbeddingDocumentsService, EmbeddingQueueService, EmbeddingService],
})
export class EmbeddingsModule {}
