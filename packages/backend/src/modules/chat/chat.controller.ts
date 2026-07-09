import {
	BadRequestException,
	Body,
	Controller,
	Post,
	Req,
	Res,
	UnauthorizedException,
} from '@nestjs/common';
import type { ChatScope } from '@resume-builder/entities';
import type { Request, Response } from 'express';
import { outdent } from 'outdent';

import configuration from '../../configuration.js';
import { CurrentUser } from '../auth/index.js';
import { CrdtClientService } from '../crdt-client/crdt-client.service.js';
import { ApplicationsService } from '../entities/applications/applications.service.js';
import { ContactInformationService } from '../entities/contact-information/contact-information.service.js';
import { ConversationsService } from '../entities/conversations/conversations.service.js';
import { CoverLettersService } from '../entities/cover-letters/cover-letters.service.js';
import { EducationsService } from '../entities/educations/educations.service.js';
import { JobsService } from '../entities/jobs/jobs.service.js';
import { ProfilesService } from '../entities/profiles/profiles.service.js';
import { ProjectsService } from '../entities/projects/projects.service.js';
import { ResumesService } from '../entities/resumes/resumes.service.js';
import { SkillsService } from '../entities/skills/skills.service.js';
import { VolunteeringService } from '../entities/volunteering/volunteering.service.js';
import type { LlmMessage } from '../llm/interfaces/llm-types.js';
import { chatTools, executeTool } from './chat-tools.js';
import { ChatService } from './chat.service.js';

@Controller('api/chat')
export class ChatController {
	constructor(
		private readonly applicationsService: ApplicationsService,
		private readonly resumesService: ResumesService,
		private readonly contactInformationService: ContactInformationService,
		private readonly educationsService: EducationsService,
		private readonly skillsService: SkillsService,
		private readonly projectsService: ProjectsService,
		private readonly jobsService: JobsService,
		private readonly volunteeringService: VolunteeringService,
		private readonly coverLettersService: CoverLettersService,
		private readonly conversationsService: ConversationsService,
		private readonly profilesService: ProfilesService,
		private readonly chatService: ChatService,
		private readonly crdtClientService: CrdtClientService,
	) {}

	@Post()
	async chat(
		@CurrentUser('sub') uid: string,
		@Req() req: Request,
		@Body()
		body: {
			messages: any[];
			data?: {
				applicationId?: string;
				conversationId?: string;
				highlightedPaths?: string[];
				scope?: ChatScope;
			};
		},
		@Res() res: Response,
	) {
		// Raw bearer token — reused to authenticate the backend's
		// Hocuspocus client session for patch_resume tool calls.
		const authHeader = req.headers.authorization ?? '';
		const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim();
		if (!accessToken) {
			throw new UnauthorizedException('Missing access token');
		}

		const { messages, data } = body;
		const applicationId = data?.applicationId;
		let conversationId = data?.conversationId;
		const scope = data?.scope;

		const isProfileScope =
			scope === 'narrative' || scope === 'background' || scope === 'preferences';

		if (!applicationId && !isProfileScope) {
			throw new BadRequestException('Application ID is required');
		}

		let resumeContext = '';
		let jobContext = '';
		let highlightedContext = '';

		if (applicationId) {
			// Fetch application and its linked resume for context injection
			const application = await this.applicationsService.find(uid, applicationId);

			const resumes = await this.resumesService.findAll(uid, undefined, {
				applicationId: application._id,
			});
			const resume = resumes[0] ?? null;

			if (resume?.data) {
				resumeContext = outdent`
					## Current Resume

					The following is the candidate's current resume for this application. Use this as your primary context — do not call get_resumes or get_resume unless the user explicitly asks about a different resume.

					\`\`\`json
					${JSON.stringify(resume.data, null, 2)}
					\`\`\`
				`;
			}

			if (application.jobDescription) {
				jobContext += outdent`
					## Job Description

					\`\`\`
					${application.jobDescription}
					\`\`\`
				`;
			}
			if (application.jobSummary) {
				jobContext += outdent`
					## Job Requirements Summary

					\`\`\`json
					${JSON.stringify(application.jobSummary, null, 2)}
					\`\`\`
				`;
			}

			const highlightedPaths = data?.highlightedPaths;
			if (highlightedPaths?.length && resume?.data) {
				const sections: Record<string, unknown> = {};
				for (const path of highlightedPaths) {
					// Paths are like "data.summary" — strip "data." prefix since resume.data is the root
					const resolvedPath = path.startsWith('data.') ? path.slice(5) : path;
					const value =
						resolvedPath === 'data' || resolvedPath === ''
							? resume.data
							: resolvedPath
									.split('.')
									.reduce((obj: any, key) => obj?.[key], resume.data);
					if (value !== undefined) {
						sections[path] = value;
					}
				}

				if (Object.keys(sections).length > 0) {
					highlightedContext = outdent`
						## Highlighted Sections

						The user has highlighted the following sections of their resume for focused attention. Prioritize these sections in your response:

						\`\`\`json
						${JSON.stringify(sections, null, 2)}
						\`\`\`
					`;
				}
			}
		}

		let profileContext = '';
		if (scope === 'narrative') {
			const profile = await this.profilesService.findOne(uid);
			if (profile?.narrative || profile?.narrativeSummary) {
				profileContext = outdent`
					## Career Narrative

					${profile.narrative ?? ''}

					## Narrative Summary

					\`\`\`json
					${JSON.stringify(profile.narrativeSummary, null, 2)}
					\`\`\`
				`;
			}
		} else if (scope === 'background') {
			const [contactInfo, educations] = await Promise.all([
				this.contactInformationService.findOne(uid),
				this.educationsService.findAll(uid),
			]);
			profileContext = outdent`
				## Contact Information

				\`\`\`json
				${JSON.stringify(contactInfo, null, 2)}
				\`\`\`

				## Education

				\`\`\`json
				${JSON.stringify(educations, null, 2)}
				\`\`\`
			`;
		} else if (scope === 'preferences') {
			const profile = await this.profilesService.findOne(uid);
			if (profile?.jobPreferences) {
				profileContext = outdent`
					## Job Preferences

					\`\`\`json
					${JSON.stringify(profile.jobPreferences, null, 2)}
					\`\`\`
				`;
			}
		}

		const systemPersona =
			scope === 'narrative'
				? 'You are an expert career coach helping the user craft their professional narrative.'
				: scope === 'background'
					? 'You are an expert professional profile editor helping the user refine their contact information and education history.'
					: scope === 'preferences'
						? 'You are an expert career advisor helping the user clarify and refine their job search preferences.'
						: 'You are an expert resume preparer. When asked you will help prepare a resume for the given job description.';

		const systemPrompt = outdent`
			${systemPersona}

			Use the available tools to retrieve the candidate's information
			(education, work history, skills, projects, etc.) as needed to
			answer the user's questions. Do not guess — always
			fetch the data using tools before responding.

			${profileContext}${resumeContext}${jobContext}${highlightedContext}
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
		const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
		const userText =
			typeof lastUserMsg?.content === 'string'
				? lastUserMsg.content
				: (lastUserMsg?.parts
						?.filter((p: any) => p.type === 'text')
						.map((p: any) => p.text)
						.join('') ?? '');

		const conversation = await this.conversationsService.findOrCreate(uid, conversationId, {
			applicationId: applicationId ?? undefined,
			title: userText.slice(0, 50) || 'New Conversation',
		});
		conversationId = conversation._id;

		// Persist user message
		if (conversation._id) {
			await this.conversationsService.appendMessage(uid, conversation._id, {
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
			crdtClientService: this.crdtClientService,
		};

		const assistantText = await this.chatService.streamWithToolLoop(res, {
			provider: configuration.llms.defaultLlm.provider,
			model: configuration.llms.defaultLlm.model,
			system: systemPrompt,
			messages: llmMessages,
			tools: chatTools,
			executeTool: (name, input) => executeTool(name, input, services, uid, accessToken),
			conversationId,
		});

		// Persist assistant response
		if (conversation._id && assistantText) {
			await this.conversationsService.appendMessage(uid, conversation._id, {
				role: 'assistant',
				content: assistantText,
			});
		}
	}
}
