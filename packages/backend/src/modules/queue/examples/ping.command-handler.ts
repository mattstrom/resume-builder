import { InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Queue } from 'bullmq';

import { QUEUES } from '../queues';
import { PingCommand, type PingCommandResult } from './ping.command';

@CommandHandler(PingCommand)
export class PingCommandHandler implements ICommandHandler<PingCommand> {
	private readonly logger = new Logger(PingCommandHandler.name);

	constructor(@InjectQueue(QUEUES.PING) private readonly queue: Queue) {}

	async execute(command: PingCommand): Promise<PingCommandResult> {
		const job = await this.queue.add('ping', { message: command.message });
		this.logger.log(
			`Enqueued ping job ${job.id} with message="${command.message}"`,
		);
		return { jobId: String(job.id) };
	}
}
