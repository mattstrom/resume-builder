import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { PingCompletedEvent } from './ping-completed.event';

@EventsHandler(PingCompletedEvent)
export class PingCompletedEventHandler implements IEventHandler<PingCompletedEvent> {
	private readonly logger = new Logger(PingCompletedEventHandler.name);

	handle(event: PingCompletedEvent): void {
		this.logger.log(
			`PingCompletedEvent received jobId=${event.jobId} message="${event.message}"`,
		);
	}
}
