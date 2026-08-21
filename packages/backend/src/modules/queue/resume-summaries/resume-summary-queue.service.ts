import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';

import { QUEUES } from '../queues.js';
import {
	RESUME_SUMMARY_JOB_NAMES,
	RESUME_SUMMARY_RECONCILIATION_INTERVAL_MS,
	RESUME_SUMMARY_RECONCILIATION_SCHEDULER,
} from './resume-summary.constants.js';
import type { ResumeSummaryTarget } from './resume-summary.types.js';

@Injectable()
export class ResumeSummaryQueueService implements OnModuleInit {
	private readonly logger = new Logger(ResumeSummaryQueueService.name);

	constructor(@InjectQueue(QUEUES.RESUME_SUMMARIES) private readonly queue: Queue) {}

	async onModuleInit(): Promise<void> {
		await this.queue.setGlobalConcurrency(1);
		await this.queue.upsertJobScheduler(
			RESUME_SUMMARY_RECONCILIATION_SCHEDULER,
			{ every: RESUME_SUMMARY_RECONCILIATION_INTERVAL_MS },
			{
				name: RESUME_SUMMARY_JOB_NAMES.RECONCILE,
				data: {},
				opts: this.retentionOptions(),
			},
		);
	}

	async enqueue(target: ResumeSummaryTarget): Promise<string | undefined> {
		try {
			const jobId = this.jobId(target);
			const existing = await this.queue.getJob(jobId);
			if (existing) {
				if ((await existing.getState()) === 'failed') {
					await existing.retry('failed');
				}
				return String(existing.id);
			}

			const job = await this.queue.add(RESUME_SUMMARY_JOB_NAMES.GENERATE, target, {
				jobId,
				attempts: 3,
				backoff: { type: 'exponential', delay: 5000 },
				...this.retentionOptions(),
			});
			return String(job.id);
		} catch (error) {
			this.logger.error(
				`Failed to enqueue resume summary for ${target.resumeId}; reconciliation will retry`,
				error instanceof Error ? error.stack : String(error),
			);
			return undefined;
		}
	}

	async enqueueMany(targets: ResumeSummaryTarget[]): Promise<void> {
		await Promise.all(targets.map((target) => this.enqueue(target)));
	}

	private jobId(target: ResumeSummaryTarget): string {
		const revision = target.sourceUpdatedAt.replace(/[^0-9]/g, '');
		return `resume--${target.resumeId}--${revision}`;
	}

	private retentionOptions() {
		return {
			removeOnComplete: { count: 1000 },
			removeOnFail: { count: 5000 },
		};
	}
}
