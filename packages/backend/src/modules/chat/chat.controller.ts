import { Body, Controller, Post, Res } from '@nestjs/common';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import type { Response } from 'express';

import { ContactInformationService } from '../entities/contact-information/contact-information.service';
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
	) {}

	@Post()
	async chat(
		@Body() body: { messages: any[]; data?: { resumeId?: string } },
		@Res() res: Response,
	) {
		const { messages } = body;

		const systemPrompt = `
			You are the assistant to a hiring manager. The hiring manager will
			provide you with a job description. Help the hiring manager
			decide if the candidate is a strong fit.

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

		await streamAnthropicResponse(res, {
			model: 'claude-haiku-4-5-20251001',
			system: systemPrompt,
			messages: anthropicMessages,
			tools: chatTools,
			executeTool: (name, input) => executeTool(name, input, services),
		});
	}
}
