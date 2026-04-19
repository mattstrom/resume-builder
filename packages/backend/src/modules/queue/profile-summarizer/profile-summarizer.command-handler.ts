import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { ProfilesService } from '../../entities/profiles/profiles.service';
import { QUEUES } from '../queues';
import {
	ProfileNarrativeSummaryCommand,
	ProfileNarrativeSummaryCommandResult,
} from './profile-summarizer.command';

@CommandHandler(ProfileNarrativeSummaryCommand)
export class ProfileNarrativeSummaryCommandHandler implements ICommandHandler<ProfileNarrativeSummaryCommand> {
	private readonly logger = new Logger(
		ProfileNarrativeSummaryCommandHandler.name,
	);

	constructor(
		@InjectQueue(QUEUES.PROFILE_NARRATIVE_SUMMARY)
		private readonly queue: Queue,
		private readonly profilesService: ProfilesService,
	) {}

	async execute(
		command: ProfileNarrativeSummaryCommand,
	): Promise<ProfileNarrativeSummaryCommandResult> {
		const profile = await this.profilesService.findOne(command.uid);

		if (!profile?.narrative?.trim()) {
			throw new BadRequestException(
				'Profile does not have a narrative to summarize',
			);
		}

		const job = await this.queue.add(
			'profile-narrative-summary',
			{ uid: command.uid },
			{
				attempts: 3,
				backoff: { type: 'exponential', delay: 5000 },
			},
		);

		this.logger.log(
			`Enqueued profile-narrative-summary job ${job.id} for uid ${command.uid}`,
		);

		return { jobId: String(job.id) };
	}
}
