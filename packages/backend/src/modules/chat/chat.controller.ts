import {
	BadRequestException,
	Body,
	Controller,
	Post,
	Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { CurrentUser } from '../auth';
import { ContactInformationService } from '../entities/contact-information/contact-information.service';
import { ConversationsService } from '../entities/conversations/conversations.service';
import { CoverLettersService } from '../entities/cover-letters/cover-letters.service';
import { EducationsService } from '../entities/educations/educations.service';
import { JobsService } from '../entities/jobs/jobs.service';
import { ProjectsService } from '../entities/projects/projects.service';
import { ResumesService } from '../entities/resumes/resumes.service';
import { SkillsService } from '../entities/skills/skills.service';
import { VolunteeringService } from '../entities/volunteering/volunteering.service';
import type { LlmMessage } from '../llm/interfaces/llm-types';
import { chatTools, executeTool } from './chat-tools';
import { ChatService } from './chat.service';

import configuration from '../../configuration';

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
		private readonly chatService: ChatService,
	) {}

	@Post()
	async chat(
		@CurrentUser('sub') uid: string,
		@Body()
		body: {
			messages: any[];
			data?: { applicationId?: string; conversationId?: string };
		},
		@Res() res: Response,
	) {
		const { messages, data } = body;
		const applicationId = data?.applicationId;
		let conversationId = data?.conversationId;

		if (!applicationId) {
			throw new BadRequestException('Application ID is required');
		}

		const systemPrompt = `
			You are an expert resume preparer. When asked you will help prepare a resume
			for the given job description.

			Use the available tools to retrieve the candidate's information
			(education, work history, skills, projects, etc.) as needed to
			answer the hiring manager's questions. Do not guess — always
			fetch the data using tools before responding.
		`;

		// Convert useChat messages to LLM-agnostic format
		const llmMessages: LlmMessage[] = messages.map((msg) => ({
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

		const conversation = await this.conversationsService.findOrCreate(
			uid,
			conversationId,
			{
				applicationId: applicationId!,
				title: userText.slice(0, 50) || 'New Conversation',
			},
		);

		// Persist user message
		if (conversation._id) {
			await this.conversationsService.appendMessage(
				uid,
				conversation._id,
				{
					role: 'user',
					content: userText,
				},
			);
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

		const assistantText = await this.chatService.streamWithToolLoop(res, {
			model: configuration.llms.defaultLlm.model,
			system: systemPrompt,
			messages: llmMessages,
			tools: chatTools,
			executeTool: (name, input) =>
				executeTool(name, input, services, uid),
			conversationId,
		});

		// Persist assistant response
		if (conversation._id && assistantText) {
			await this.conversationsService.appendMessage(
				uid,
				conversation._id,
				{
					role: 'assistant',
					content: assistantText,
				},
			);
		}
	}
}
