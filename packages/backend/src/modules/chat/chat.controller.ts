import { Body, Controller, Post, Res } from '@nestjs/common';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import type { Response } from 'express';

import { ContactInformationService } from '../entities/contact-information/contact-information.service';
import { ConversationsService } from '../entities/conversations/conversations.service';
import { CoverLettersService } from '../entities/cover-letters/cover-letters.service';
import { EducationsService } from '../entities/educations/educations.service';
import { JobsService } from '../entities/jobs/jobs.service';
import { ProjectsService } from '../entities/projects/projects.service';
import { ResumesService } from '../entities/resumes/resumes.service';
import { SkillsService } from '../entities/skills/skills.service';
import { VolunteeringService } from '../entities/volunteering/volunteering.service';
import { streamAnthropicResponse } from './anthropic-stream-adapter';
import { chatTools, executeTool } from './chat-tools';

@Controller('api/chat')
export class ChatController {
	constructor(
		private readonly resumesService: ResumesService,
		private readonly contactInformationService: ContactInformationService,
		private readonly educationsService: EducationsService,
		private readonly skillsService: SkillsService,
		private readonly projectsService: ProjectsService,
		private readonly jobsService: JobsService,
		private readonly volunteeringService: VolunteeringService,
		private readonly coverLettersService: CoverLettersService,
		private readonly conversationsService: ConversationsService,
	) {}

	@Post()
	async chat(
		@Body()
		body: {
			messages: any[];
			data?: { resumeId?: string; conversationId?: string };
		},
		@Res() res: Response,
	) {
		const { messages, data } = body;
		const resumeId = data?.resumeId;
		let conversationId = data?.conversationId;

		const systemPrompt = `
			You are an expert resume preparer. When asked you will help prepare a resume
			for the given job description.

			Use the available tools to retrieve the candidate's information
			(education, work history, skills, projects, etc.) as needed to
			answer the hiring manager's questions. Do not guess — always
			fetch the data using tools before responding.
		`;

		// Convert useChat messages to Anthropic format
		const anthropicMessages: MessageParam[] = messages.map((msg) => ({
			role: msg.role as 'user' | 'assistant',
			content:
				typeof msg.content === 'string'
					? msg.content
					: (msg.parts
							?.filter((p: any) => p.type === 'text')
							.map((p: any) => p.text)
							.join('') ?? ''),
		}));

		// Get the latest user message text for persistence
		const lastUserMsg = [...messages]
			.reverse()
			.find((m) => m.role === 'user');
		const userText =
			typeof lastUserMsg?.content === 'string'
				? lastUserMsg.content
				: (lastUserMsg?.parts
						?.filter((p: any) => p.type === 'text')
						.map((p: any) => p.text)
						.join('') ?? '');

		// Create conversation on first message if needed
		if (!conversationId && resumeId) {
			const title = userText.slice(0, 50) || 'New Conversation';
			const conversation = await this.conversationsService.create({
				resumeId,
				title,
			});
			conversationId = String(conversation._id);
		}

		// Persist user message
		if (conversationId) {
			await this.conversationsService.appendMessage(conversationId, {
				role: 'user',
				content: userText,
			});
		}

		const services = {
			resumesService: this.resumesService,
			contactInformationService: this.contactInformationService,
			educationsService: this.educationsService,
			skillsService: this.skillsService,
			projectsService: this.projectsService,
			jobsService: this.jobsService,
			volunteeringService: this.volunteeringService,
			coverLettersService: this.coverLettersService,
		};

		const assistantText = await streamAnthropicResponse(res, {
			model: 'claude-haiku-4-5-20251001',
			system: systemPrompt,
			messages: anthropicMessages,
			tools: chatTools,
			executeTool: (name, input) => executeTool(name, input, services),
			conversationId,
		});

		// Persist assistant response
		if (conversationId && assistantText) {
			await this.conversationsService.appendMessage(conversationId, {
				role: 'assistant',
				content: assistantText,
			});
		}
	}
}
