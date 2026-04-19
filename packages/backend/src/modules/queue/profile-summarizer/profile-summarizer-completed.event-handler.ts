import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ProfileNarrativeSummaryCompletedEvent } from './profile-summarizer-completed.event';

@EventsHandler(ProfileNarrativeSummaryCompletedEvent)
export class ProfileNarrativeSummaryCompletedEventHandler implements IEventHandler<ProfileNarrativeSummaryCompletedEvent> {
	private readonly logger = new Logger(
		ProfileNarrativeSummaryCompletedEventHandler.name,
	);

	handle(event: ProfileNarrativeSummaryCompletedEvent): void {
		this.logger.log(
			`Profile narrative summary completed: job=${event.jobId} uid=${event.uid}`,
		);
	}
}
