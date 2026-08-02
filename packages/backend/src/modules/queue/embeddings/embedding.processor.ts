import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { QUEUES } from '../queues.js';
import { EmbeddingDocumentsService } from './embedding-documents.service.js';
import { EmbeddingQueueService } from './embedding-queue.service.js';
import { EMBEDDING_JOB_NAMES, EMBEDDING_MODEL } from './embedding.constants.js';
import { EmbeddingService } from './embedding.service.js';
import type { GenerateEmbeddingJobData, ReconcileEmbeddingsJobData } from './embedding.types.js';

@Processor(QUEUES.EMBEDDINGS, { concurrency: 1 })
export class EmbeddingProcessor extends WorkerHost {
	private readonly logger = new Logger(EmbeddingProcessor.name);

	constructor(
		private readonly documents: EmbeddingDocumentsService,
		private readonly embedding: EmbeddingService,
		private readonly queue: EmbeddingQueueService,
	) {
		super();
	}

	async process(job: Job<GenerateEmbeddingJobData | ReconcileEmbeddingsJobData>): Promise<void> {
		if (job.name === EMBEDDING_JOB_NAMES.RECONCILE) {
			const data = job.data as ReconcileEmbeddingsJobData;
			const targets = await this.documents.findStaleTargets(data.entityType, data.limit);
			await this.queue.enqueueMany(targets);
			this.logger.log(`Reconciled ${targets.length} stale embedding targets`);
			return;
		}

		if (job.name !== EMBEDDING_JOB_NAMES.GENERATE) {
			throw new Error(`Unknown embedding job ${job.name}`);
		}

		const target = job.data as GenerateEmbeddingJobData;
		const document = await this.documents.loadDocument(target.entityId, target.entityType);
		if (!document) return;
		if (document.revision !== target.revision || document.profile !== target.profile) {
			this.logger.debug(
				`Skipping superseded ${target.entityType} embedding for ${target.entityId}`,
			);
			return;
		}

		const vector = await this.embedding.embed(document.text);
		const saved = await this.documents.saveIfCurrent(
			target.entityId,
			target.revision,
			target.profile,
			EMBEDDING_MODEL,
			vector,
			target.entityType,
		);
		if (!saved) {
			this.logger.debug(
				`Discarded superseded ${target.entityType} embedding for ${target.entityId}`,
			);
		}
	}
}
