import { Body, Controller, Post, Res } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Resume } from '@resume-builder/entities';
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { Response } from 'express';
import { Model } from 'mongoose';

@Controller('api/chat')
export class ChatController {
	constructor(
		@InjectModel(Resume.name)
		private readonly resumeModel: Model<Resume>,
	) {}

	@Post()
	async chat(
		@Body() body: { messages: any[]; data?: { resumeId?: string } },
		@Res() res: Response,
	) {
		const { messages, data } = body;

		let systemPrompt =
			'You are a helpful resume writing assistant. Help the user improve their resume with specific, actionable suggestions.';

		if (data?.resumeId) {
			const resume = await this.resumeModel
				.findById(data.resumeId)
				.lean()
				.exec();

			if (resume) {
				systemPrompt += `\n\nHere is the user's current resume data:\n${JSON.stringify(resume, null, 2)}`;
			}
		}

		const result = streamText({
			model: anthropic('claude-sonnet-4-20250514'),
			system: systemPrompt,
			messages,
		});

		result.pipeTextStreamToResponse(res);
	}
}
