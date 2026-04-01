import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Resolver, Tool, UseGuards } from '@nestjs-mcp/server';
import {
	CoverLetter,
	coverLetterSchema,
	ResumeCreateInput,
	resumeInputSchema,
} from '@resume-builder/entities';
import { outdent } from 'outdent';
import { z } from 'zod';

import { ContactInformationService } from '../entities/contact-information/contact-information.service';
import { CoverLettersService } from '../entities/cover-letters/cover-letters.service';
import { EducationsService } from '../entities/educations/educations.service';
import { JobsService } from '../entities/jobs/jobs.service';
import { ProjectsService } from '../entities/projects/projects.service';
import { ResumesService } from '../entities/resumes/resumes.service';
import { SkillsService } from '../entities/skills/skills.service';
import { type McpExtra, type McpToolParams } from './types';
import { McpGuard } from './mcp.guard';

const getSkillsSchema = {
	categories: z.array(z.string()).optional(),
};

@Resolver()
@UseGuards(McpGuard)
export class ResumesResolver {
	constructor(
		private contactInformationService: ContactInformationService,
		private coverLettersService: CoverLettersService,
		private educationsService: EducationsService,
		private jobsService: JobsService,
		private projectsService: ProjectsService,
		private resumesService: ResumesService,
		private skillsService: SkillsService,
	) {}

	/**
	 * Simple health check tool
	 */
	@Tool({
		name: 'get_resumes',
		description: 'Retrieves all resumes for the current user',
		paramsSchema: {},
		annotations: {
			destructureHint: false,
			idempotentHint: true,
		},
	})
	async getResumes({ user }: McpExtra): Promise<CallToolResult> {
		const resumes = await this.resumesService.findAll(user.sub);

		return {
			content: [
				{
					type: 'text',
					text: `Found ${resumes.length} resumes.\n${JSON.stringify(resumes, null, 2)}`,
				},
			],
			structuredContent: {
				resumes,
			},
		};
	}

	@Tool({
		name: 'get_resume',
		description: 'Retrieves a resume by ID',
		paramsSchema: { id: z.string() },
		annotations: {
			destructureHint: false,
			idempotentHint: true,
		},
	})
	async getResume(
		{ id }: McpToolParams<{ id: string }>,
		{ user }: McpExtra,
	): Promise<CallToolResult> {
		const resume = await this.resumesService.find(user.sub, id);

		if (!resume) {
			return {
				content: [
					{
						type: 'text',
						text: `Resume with ID ${id} not found.`,
					},
				],
			};
		}

		return {
			content: [
				{
					type: 'text',
					text: outdent`
						Found resume with ID ${id}:
						${JSON.stringify(resume, null, 2)}
					`,
				},
			],
			structuredContent: {
				resume,
			},
		};
	}

	@Tool({
		name: 'save_resume',
		description:
			'Saves a resume to the database. If an id is provided, updates the existing resume; otherwise creates a new one.',
		paramsSchema: {
			id: z.string().optional(),
			resume: resumeInputSchema,
		},
		annotations: {
			destructureHint: true,
			idempotentHint: false,
		},
	})
	async saveResume(
		{
			id,
			resume,
		}: McpToolParams<{ id?: string; resume: ResumeCreateInput }>,
		{ user }: McpExtra,
	) {
		const savedResume = id
			? await this.resumesService.update(user.sub, id, resume)
			: await this.resumesService.create(user.sub, resume);

		return {
			content: [
				{
					type: 'text',
					text: `Resume saved successfully. ID: ${savedResume._id}`,
				},
			],
			structuredContent: {
				resume: savedResume,
			},
		};
	}

	@Tool({
		name: 'get_contact_information',
		description: 'Retrieve contact information from the database',
		annotations: {
			destructureHint: false,
			idempotentHint: true,
		},
	})
	async getContactInformation({ user }: McpExtra): Promise<CallToolResult> {
		const contactInfo = await this.contactInformationService.findOne(
			user.sub,
		);

		return {
			content: [
				{
					type: 'text',
					text: `Contact information: ${JSON.stringify(contactInfo)}`,
				},
			],
			structuredContent: {
				contactInfo,
			},
		};
	}

	@Tool({
		name: 'get_jobs',
		description: 'Retrieve job listings from the database',
		annotations: {
			destructureHint: false,
			idempotentHint: true,
		},
	})
	async getJobs({ user }: McpExtra): Promise<CallToolResult> {
		const jobs = await this.jobsService.findAll(user.sub);

		return {
			content: [
				{
					type: 'text',
					text: outdent`
						Found ${jobs.length} job listings.
						${JSON.stringify(jobs, null, 2)}
					`,
				},
			],
			structuredContent: {
				jobs,
			},
		};
	}

	@Tool({
		name: 'get_education',
		description: 'Retrieve education from the database',
		annotations: {
			destructureHint: false,
			idempotentHint: true,
		},
	})
	async getEducation({ user }: McpExtra): Promise<CallToolResult> {
		const education = await this.educationsService.findAll(user.sub);

		return {
			content: [
				{
					type: 'text',
					text: outdent`
						Found ${education.length} education entries.
						${JSON.stringify(education, null, 2)}
					`,
				},
			],
			structuredContent: {
				education,
			},
		};
	}

	@Tool({
		name: 'get_projects',
		description: 'Retrieve projects from the database',
		annotations: {
			destructureHint: false,
			idempotentHint: true,
		},
	})
	async getProjects({ user }: McpExtra): Promise<CallToolResult> {
		const projects = await this.projectsService.findAll(user.sub);

		return {
			content: [
				{
					type: 'text',
					text: outdent`
						Found ${projects.length} projects.
						${JSON.stringify(projects, null, 2)}
					`,
				},
			],
			structuredContent: {
				projects,
			},
		};
	}

	@Tool({
		name: 'get_skills',
		description: 'Retrieve skills, optionally filtered by category',
		paramsSchema: getSkillsSchema,
		annotations: {
			destructureHint: false,
			idempotentHint: true,
		},
	})
	async getSkills(
		{
			categories,
		}: McpToolParams<{
			categories?: string[];
		}>,
		{ user }: McpExtra,
	): Promise<CallToolResult> {
		const skills = await this.skillsService.findAll(user.sub, categories);
		const skillsText = skills.map((skill) => skill.name).join(', ');

		return {
			content: [
				{
					type: 'text',
					text: outdent`
						Skills:
						${JSON.stringify(skills, null, 2)}
					`,
				},
			],
			structuredContent: {
				skills,
			},
		};
	}

	@Tool({
		name: 'get_cover_letters',
		description: 'Retrieve cover letters from the database',
		annotations: {
			destructureHint: false,
			idempotentHint: true,
		},
	})
	async getCoverLetters({ user }: McpExtra): Promise<CallToolResult> {
		const coverLetters = await this.coverLettersService.findAll(user.sub);

		return {
			content: [
				{
					type: 'text',
					text: `Found ${coverLetters.length} cover letters.`,
				},
			],
			structuredContent: {
				coverLetters,
			},
		};
	}

	@Tool({
		name: 'get_cover_letter',
		description: 'Retrieve cover letter by ID',
		paramsSchema: {
			id: z.uuid(),
		},
		annotations: {
			destructureHint: false,
			idempotentHint: true,
		},
	})
	async getCoverLetter(
		{ id }: McpToolParams<{ id: string }>,
		{ user }: McpExtra,
	): Promise<CallToolResult> {
		const coverLetter = await this.coverLettersService.find(user.sub, id);

		if (!coverLetter) {
			return {
				content: [
					{
						type: 'text',
						text: `Cover letter with ID ${id} not found.`,
					},
				],
			};
		}

		return {
			content: [
				{
					type: 'text',
					text: outdent`
						Cover letter with ID ${id} found.
						${JSON.stringify(coverLetter)}
					`,
				},
			],
			structuredContent: {
				coverLetter,
			},
		};
	}

	@Tool({
		name: 'save_cover_letter',
		description: 'Saves a cover letter to the database',
		paramsSchema: { coverLetter: coverLetterSchema },
		annotations: {
			destructureHint: true,
			idempotentHint: false,
		},
	})
	async saveCoverLetter(
		{ coverLetter }: McpToolParams<{ coverLetter: CoverLetter }>,
		{ user }: McpExtra,
	) {
		const savedCoverLetter = await this.coverLettersService.create(
			user.sub,
			coverLetter,
		);

		return {
			content: [
				{
					type: 'text',
					text: `Cover letter saved successfully. ID: ${savedCoverLetter._id}`,
				},
			],
			structuredContent: {
				coverLetter: savedCoverLetter,
			},
		};
	}
}
