import { Body, Controller, Post, Res } from '@nestjs/common';
import { convertToModelMessages, streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { Response } from 'express';

import { EducationsService } from '../entities/educations/educations.service';
import { JobsService } from '../entities/jobs/jobs.service';
import { ProjectsService } from '../entities/projects/projects.service';
import { SkillsService } from '../entities/skills/skills.service';
import { VolunteeringService } from '../entities/volunteering/volunteering.service';

@Controller('api/chat')
export class ChatController {
	constructor(
		private readonly educationsService: EducationsService,
		private readonly skillsService: SkillsService,
		private readonly projectsService: ProjectsService,
		private readonly jobsService: JobsService,
		private readonly volunteeringService: VolunteeringService,
	) {}

	@Post()
	async chat(
		@Body() body: { messages: any[]; data?: { resumeId?: string } },
		@Res() res: Response,
	) {
		const { messages, data } = body;

		const educations = await this.educationsService.findAll();
		const skills = await this.skillsService.findAll();
		const jobs = await this.jobsService.findAll();
		const projects = await this.projectsService.findAll();
		const volunteering = await this.volunteeringService.findAll();

		let systemPrompt = `
			You are the assistant to a hiring manager. The hiring manager will
			provide you with a job description. Help the hiring manager
			decide if the candidate is a strong fit.
			
			# Candidate Information
			## Education
			${JSON.stringify(educations)}
			
			## Work History
			${JSON.stringify(jobs)}
			
			## Skills
			${JSON.stringify(skills)}
			
			## Projects
			${JSON.stringify(projects)}
			
			## Volunteering
			${JSON.stringify(volunteering)}
		`;

		const result = streamText({
			model: anthropic('claude-haiku-4-5-20251001'),
			// model: anthropic('claude-sonnet-4-20250514'),
			system: systemPrompt,
			messages: await convertToModelMessages(messages),
		});

		result.pipeUIMessageStreamToResponse(res);
	}
}
