import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { QUEUES } from '../queues.js';
import { EMBEDDING_PROFILES } from '../embeddings/embedding.constants.js';
import { EmbeddingQueueService } from '../embeddings/embedding-queue.service.js';
import { MastraResumeSummarizerService } from './mastra-resume-summarizer.service.js';
import { ResumeSummaryDocumentsService } from './resume-summary-documents.service.js';
import { ResumeSummaryQueueService } from './resume-summary-queue.service.js';
import {
	RESUME_SUMMARY_JOB_NAMES,
	RESUME_SUMMARY_RECONCILIATION_BATCH_SIZE,
} from './resume-summary.constants.js';
import type {
	GenerateResumeSummaryJobData,
	ReconcileResumeSummariesJobData,
} from './resume-summary.types.js';

@Processor(QUEUES.RESUME_SUMMARIES, { concurrency: 1 })
export class ResumeSummaryProcessor extends WorkerHost {
	private readonly logger = new Logger(ResumeSummaryProcessor.name);

	constructor(
		private readonly documents: ResumeSummaryDocumentsService,
		private readonly queue: ResumeSummaryQueueService,
		private readonly summarizer: MastraResumeSummarizerService,
		private readonly embeddings: EmbeddingQueueService,
	) {
		super();
	}

	async process(
		job: Job<GenerateResumeSummaryJobData | ReconcileResumeSummariesJobData>,
	): Promise<void> {
		if (job.name === RESUME_SUMMARY_JOB_NAMES.RECONCILE) {
			const data = job.data as ReconcileResumeSummariesJobData;
			const targets = await this.documents.findStaleTargets(
				data.limit ?? RESUME_SUMMARY_RECONCILIATION_BATCH_SIZE,
			);
			await this.queue.enqueueMany(targets);
			this.logger.log(`Reconciled ${targets.length} stale resume summaries`);
			return;
		}

		if (job.name !== RESUME_SUMMARY_JOB_NAMES.GENERATE) {
			throw new Error(`Unknown resume summary job ${job.name}`);
		}

		const target = job.data as GenerateResumeSummaryJobData;
		const document = await this.documents.loadDocument(target.resumeId);
		if (!document) return;

		if (document.sourceUpdatedAt !== target.sourceUpdatedAt) {
			this.logger.debug(
				`Skipping superseded resume summary for ${target.resumeId}`,
			);
			return;
		}

		const summary = await this.summarizer.summarize(document);
		const embeddingRevision = await this.documents.saveIfCurrent(
			target.resumeId,
			target.sourceUpdatedAt,
			summary,
		);
		if (embeddingRevision === null) {
			this.logger.debug(
				`Discarded superseded resume summary for ${target.resumeId}`,
			);
			return;
		}
		await this.embeddings.enqueue({
			entityType: 'resume',
			entityId: target.resumeId,
			revision: embeddingRevision,
			profile: EMBEDDING_PROFILES.resume,
		});
	}
}
