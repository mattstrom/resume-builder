import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Query,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';

@Controller('api/conversations')
export class ConversationsController {
	constructor(private readonly conversationsService: ConversationsService) {}

	@Get()
	async findAll(@Query('resumeId') resumeId: string) {
		return this.conversationsService.findAllByResumeId(resumeId);
	}

	@Get(':id')
	async findById(@Param('id') id: string) {
		return this.conversationsService.findById(id);
	}

	@Post()
	async create(@Body() body: { resumeId: string; title?: string }) {
		return this.conversationsService.create(body);
	}

	@Delete(':id')
	async delete(@Param('id') id: string) {
		await this.conversationsService.delete(id);
		return { success: true };
	}
}
