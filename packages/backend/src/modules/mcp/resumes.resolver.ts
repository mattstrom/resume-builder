import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Resolver, Tool, UseGuards } from '@nestjs-mcp/server';
import {
	CoverLetter,
	coverLetterSchema,
	JobInput,
	ProjectInput,
	ResumeCreateInput,
	resumeInputSchema,
	SkillInput,
	VolunteeringInput,
} from '@resume-builder/entities';
import { outdent } from 'outdent';
import { z } from 'zod';

import { ContactInformationService } from '../entities/contact-information/contact-information.service.js';
import { CoverLettersService } from '../entities/cover-letters/cover-letters.service.js';
import { EducationsService } from '../entities/educations/educations.service.js';
import { JobsService } from '../entities/jobs/jobs.service.js';
import { ProjectsService } from '../entities/projects/projects.service.js';
import { ResumesService } from '../entities/resumes/resumes.service.js';
import { SkillsService } from '../entities/skills/skills.service.js';
import { VolunteeringService } from '../entities/volunteering/volunteering.service.js';
import { McpGuard } from './mcp.guard.js';
import { type McpExtra, type McpToolParams } from './types.js';

const getSkillsSchema = {
	categories: z.array(z.string()).optional(),
};

const createJobSchema = {
	company: z.string(),
	position: z.string(),
	location: z.string(),
	startDate: z.string(),
	endDate: z.string().optional(),
	responsibilities: z.array(z.string()),
	relevance: z.number().min(0).max(1).optional(),
};

const createProjectSchema = {
	name: z.string(),
	technologies: z.array(z.string()),
	items: z.array(z.string()),
	type: z.enum(['professional', 'personal']).optional(),
	relevance: z.number().min(0).max(1).optional(),
};

const createSkillSchema = {
	name: z.string(),
	category: z.string(),
	relevance: z.number().min(0).max(1).optional(),
};

const createVolunteeringSchema = {
	organization: z.string().optional(),
	position: z.string(),
	location: z.string().optional(),
	startDate: z.string(),
	endDate: z.string().optional(),
	responsibilities: z.array(z.string()),
	relevance: z.number().min(0).max(1).optional(),
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
		private volunteeringService: VolunteeringService,
	) {}

	/**
	 * Simple health check tool
	 */
	@Tool({
		name: 'get_resumes',
		description: 'Retrieves all resumes for the current user',
		paramsSchema: {},
		annotations: {
			destructiveHint: false,
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
			destructiveHint: false,
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
			destructiveHint: true,
			idempotentHint: false,
		},
	})
	async saveResume(
		{ id, resume }: McpToolParams<{ id?: string; resume: ResumeCreateInput }>,
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
			destructiveHint: false,
			idempotentHint: true,
		},
	})
	async getContactInformation({ user }: McpExtra): Promise<CallToolResult> {
		const contactInfo = await this.contactInformationService.findOne(user.sub);

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
			destructiveHint: false,
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
			destructiveHint: false,
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
			destructiveHint: false,
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
			destructiveHint: false,
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
			destructiveHint: false,
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
			destructiveHint: false,
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
			destructiveHint: true,
			idempotentHint: false,
		},
	})
	async saveCoverLetter(
		{ coverLetter }: McpToolParams<{ coverLetter: CoverLetter }>,
		{ user }: McpExtra,
	) {
		const savedCoverLetter = await this.coverLettersService.create(user.sub, coverLetter);

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

	@Tool({
		name: 'get_volunteering',
		description: 'Retrieve volunteering entries from the database',
		annotations: {
			destructiveHint: false,
			idempotentHint: true,
		},
	})
	async getVolunteering({ user }: McpExtra): Promise<CallToolResult> {
		const volunteering = await this.volunteeringService.findAll(user.sub);

		return {
			content: [
				{
					type: 'text',
					text: outdent`
						Found ${volunteering.length} volunteering entries.
						${JSON.stringify(volunteering, null, 2)}
					`,
				},
			],
			structuredContent: { volunteering },
		};
	}

	@Tool({
		name: 'create_job',
		description: 'Create a new job entry in the database',
		paramsSchema: createJobSchema,
		annotations: {
			destructiveHint: true,
			idempotentHint: false,
		},
	})
	async createJob(jobData: McpToolParams<JobInput>, { user }: McpExtra): Promise<CallToolResult> {
		const job = await this.jobsService.create(user.sub, jobData as JobInput);

		return {
			content: [{ type: 'text', text: `Job created successfully. ID: ${job._id}` }],
			structuredContent: { job },
		};
	}

	@Tool({
		name: 'create_project',
		description: 'Create a new project entry in the database',
		paramsSchema: createProjectSchema,
		annotations: {
			destructiveHint: true,
			idempotentHint: false,
		},
	})
	async createProject(
		projectData: McpToolParams<ProjectInput>,
		{ user }: McpExtra,
	): Promise<CallToolResult> {
		const project = await this.projectsService.create(user.sub, projectData as ProjectInput);

		return {
			content: [{ type: 'text', text: `Project created successfully. ID: ${project._id}` }],
			structuredContent: { project },
		};
	}

	@Tool({
		name: 'create_skill',
		description: 'Create a new skill entry in the database',
		paramsSchema: createSkillSchema,
		annotations: {
			destructiveHint: true,
			idempotentHint: false,
		},
	})
	async createSkill(
		skillData: McpToolParams<SkillInput>,
		{ user }: McpExtra,
	): Promise<CallToolResult> {
		const skill = await this.skillsService.create(user.sub, skillData as SkillInput);

		return {
			content: [{ type: 'text', text: `Skill created successfully. ID: ${skill._id}` }],
			structuredContent: { skill },
		};
	}

	@Tool({
		name: 'create_volunteering',
		description: 'Create a new volunteering entry in the database',
		paramsSchema: createVolunteeringSchema,
		annotations: {
			destructiveHint: true,
			idempotentHint: false,
		},
	})
	async createVolunteering(
		volunteeringData: McpToolParams<VolunteeringInput>,
		{ user }: McpExtra,
	): Promise<CallToolResult> {
		const volunteering = await this.volunteeringService.create(
			user.sub,
			volunteeringData as VolunteeringInput,
		);

		return {
			content: [
				{
					type: 'text',
					text: `Volunteering entry created successfully. ID: ${volunteering._id}`,
				},
			],
			structuredContent: { volunteering },
		};
	}
}
