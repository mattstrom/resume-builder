import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { ApplicationsService } from '../../entities/applications/applications.service';
import { QUEUES } from '../queues';
import {
	JobAssessmentCommand,
	JobAssessmentCommandResult,
} from './job-assessment.command';

@CommandHandler(JobAssessmentCommand)
export class JobAssessmentCommandHandler implements ICommandHandler<JobAssessmentCommand> {
	private readonly logger = new Logger(JobAssessmentCommandHandler.name);

	constructor(
		@InjectQueue(QUEUES.JOB_ASSESSMENT) private readonly queue: Queue,
		private readonly applicationsService: ApplicationsService,
	) {}

	async execute(
		command: JobAssessmentCommand,
	): Promise<JobAssessmentCommandResult> {
		const application = await this.applicationsService.find(
			command.uid,
			command.applicationId,
		);

		if (!application.jobDescription) {
			throw new BadRequestException(
				'Application does not have a jobDescription to assess',
			);
		}

		const job = await this.queue.add(
			'job-assessment',
			{ applicationId: command.applicationId, uid: command.uid },
			{
				attempts: 3,
				backoff: { type: 'exponential', delay: 5000 },
			},
		);

		this.logger.log(
			`Enqueued job-assessment job ${job.id} for application ${command.applicationId}`,
		);

		return { jobId: String(job.id) };
	}
}
