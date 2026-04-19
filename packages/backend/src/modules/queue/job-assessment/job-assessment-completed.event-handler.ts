import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { JobAssessmentCompletedEvent } from './job-assessment-completed.event';

@EventsHandler(JobAssessmentCompletedEvent)
export class JobAssessmentCompletedEventHandler implements IEventHandler<JobAssessmentCompletedEvent> {
	private readonly logger = new Logger(
		JobAssessmentCompletedEventHandler.name,
	);

	handle(event: JobAssessmentCompletedEvent): void {
		this.logger.log(
			`Job assessment complete: jobId=${event.jobId} applicationId=${event.applicationId}`,
		);
	}
}
