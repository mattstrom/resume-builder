import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/index.js';
import { QUEUES } from '../queues.js';
import { EmbeddingDocumentsService } from './embedding-documents.service.js';
import { EmbeddingQueueService } from './embedding-queue.service.js';
import { EmbeddingService } from './embedding.service.js';

// EmbeddingProcessor is disabled: it was suspected of bringing down the
// server. Jobs still enqueue via EmbeddingQueueService but sit unconsumed
// until the processor is re-registered here.
@Module({
	imports: [PrismaModule, BullModule.registerQueue({ name: QUEUES.EMBEDDINGS })],
	providers: [EmbeddingDocumentsService, EmbeddingQueueService, EmbeddingService],
	exports: [EmbeddingDocumentsService, EmbeddingQueueService, EmbeddingService],
})
export class EmbeddingsModule {}
