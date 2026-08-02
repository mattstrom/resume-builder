import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';

import { QUEUES } from '../queues.js';
import {
	EMBEDDING_JOB_NAMES,
	EMBEDDING_RECONCILIATION_INTERVAL_MS,
	EMBEDDING_RECONCILIATION_SCHEDULER,
} from './embedding.constants.js';
import type { EmbeddingTarget } from './embedding.types.js';

@Injectable()
export class EmbeddingQueueService implements OnModuleInit {
	private readonly logger = new Logger(EmbeddingQueueService.name);

	constructor(@InjectQueue(QUEUES.EMBEDDINGS) private readonly queue: Queue) {}

	async onModuleInit(): Promise<void> {
		await this.queue.upsertJobScheduler(
			EMBEDDING_RECONCILIATION_SCHEDULER,
			{ every: EMBEDDING_RECONCILIATION_INTERVAL_MS },
			{
				name: EMBEDDING_JOB_NAMES.RECONCILE,
				data: {},
				opts: this.retentionOptions(),
			},
		);
	}

	async enqueue(target: EmbeddingTarget): Promise<string | undefined> {
		try {
			const job = await this.queue.add(EMBEDDING_JOB_NAMES.GENERATE, target, {
				jobId: this.jobId(target),
				attempts: 5,
				backoff: { type: 'exponential', delay: 2000 },
				...this.retentionOptions(),
			});
			return String(job.id);
		} catch (error) {
			this.logger.error(
				`Failed to enqueue ${target.entityType} embedding for ${target.entityId}; reconciliation will retry`,
				error instanceof Error ? error.stack : String(error),
			);
			return undefined;
		}
	}

	async enqueueMany(targets: EmbeddingTarget[]): Promise<void> {
		await Promise.all(targets.map((target) => this.enqueue(target)));
	}

	private jobId(target: EmbeddingTarget): string {
		const profile = target.profile.replace(/[^a-zA-Z0-9_-]/g, '-');
		return `${target.entityType}--${target.entityId}--${profile}--${target.revision}`;
	}

	private retentionOptions() {
		return {
			removeOnComplete: { count: 1000 },
			removeOnFail: { count: 5000 },
		};
	}
}
