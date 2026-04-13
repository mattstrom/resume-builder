import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Query,
} from '@nestjs/common';
import type { ChatModelSelection } from '@resume-builder/entities';
import { CurrentUser } from '../../auth';
import { ConversationsService } from './conversations.service';

@Controller('api/conversations')
export class ConversationsController {
	constructor(private readonly conversationsService: ConversationsService) {}

	@Get()
	async findAll(
		@CurrentUser('sub') uid: string,
		@Query('applicationId') applicationId: string,
	) {
		return this.conversationsService.findAllByApplicationId(
			uid,
			applicationId,
		);
	}

	@Get(':id')
	async findById(@CurrentUser('sub') uid: string, @Param('id') id: string) {
		return this.conversationsService.findById(uid, id);
	}

	@Post()
	async create(
		@CurrentUser('sub') uid: string,
		@Body()
		body: {
			applicationId: string;
			title?: string;
			model?: ChatModelSelection;
		},
	) {
		return this.conversationsService.create(uid, body);
	}

	@Delete(':id')
	async delete(@CurrentUser('sub') uid: string, @Param('id') id: string) {
		await this.conversationsService.delete(uid, id);
		return { success: true };
	}
}
