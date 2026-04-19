import { Controller, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from '../../auth/current-user.decorator';
import {
	JobAssessmentCommand,
	JobAssessmentCommandResult,
} from '../../queue/job-assessment/job-assessment.command';

@Controller('applications')
export class ApplicationsController {
	constructor(private readonly commandBus: CommandBus) {}

	@Post(':id/assess')
	assess(
		@Param('id') id: string,
		@CurrentUser('sub') uid: string,
	): Promise<JobAssessmentCommandResult> {
		return this.commandBus.execute(new JobAssessmentCommand(id, uid));
	}
}
