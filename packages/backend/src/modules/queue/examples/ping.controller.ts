import { Body, Controller, ForbiddenException, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { PingCommand, type PingCommandResult } from './ping.command';

/**
 * Dev-only smoke-test endpoint for the queue pipeline. Not exposed in
 * production — this is scaffolding used to verify the Command → Queue →
 * Processor → Event path works end-to-end.
 */
@Controller('queue/ping')
export class PingController {
	constructor(private readonly commandBus: CommandBus) {}

	@Post()
	async ping(@Body('message') message?: string): Promise<PingCommandResult> {
		if (process.env.NODE_ENV === 'production') {
			throw new ForbiddenException();
		}
		return this.commandBus.execute<PingCommand, PingCommandResult>(
			new PingCommand(message ?? 'hello'),
		);
	}
}
