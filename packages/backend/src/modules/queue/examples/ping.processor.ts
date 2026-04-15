import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Job } from 'bullmq';

import { QUEUES } from '../queues';
import { PingCompletedEvent } from './ping-completed.event';

interface PingJobData {
	message: string;
}

@Processor(QUEUES.PING)
export class PingProcessor extends WorkerHost {
	private readonly logger = new Logger(PingProcessor.name);

	constructor(private readonly eventBus: EventBus) {
		super();
	}

	async process(job: Job<PingJobData>): Promise<void> {
		this.logger.log(
			`Processing ping job ${job.id} message="${job.data.message}"`,
		);
		await new Promise((resolve) => setTimeout(resolve, 250));
		this.eventBus.publish(
			new PingCompletedEvent(String(job.id), job.data.message),
		);
	}
}
