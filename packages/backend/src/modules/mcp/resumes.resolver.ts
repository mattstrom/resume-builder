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

import { CrdtApiService, type ResumePatchOp } from '../crdt-client/crdt-api.service.js';
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

const resumePatchOpSchema = z.union([
	z.object({ op: z.literal('set'), path: z.string().min(1), value: z.unknown() }),
	z.object({ op: z.literal('delete'), path: z.string().min(1) }),
	z.object({
		op: z.literal('insert'),
		path: z.string().min(1),
		index: z.number().int().nonnegative(),
		value: z.unknown(),
	}),
	z.object({
		op: z.literal('remove'),
		path: z.string().min(1),
		index: z.number().int().nonnegative(),
	}),
]);

@Resolver()
@UseGuards(McpGuard)
export class ResumesResolver {
	constructor(
		private contactInformationService: ContactInformationService,
		private coverLettersService: CoverLettersService,
		private crdtApiService: CrdtApiService,
		private educationsService: EducationsService,
		private jobsService: JobsService,
		private projectsService: ProjectsService,
		private resumesService: ResumesService,
		private skillsService: SkillsService,
		private volunteeringService: VolunteeringService,
	) {}

	@Tool({
		name: 'patch_resume',
		description:
			'Apply targeted changes to an existing resume without resubmitting the full document. ' +
			'Use set for a field, delete for a map key, and insert/remove for array items. ' +
			'Call get_resume first to confirm paths and current array indices. Changes appear live ' +
			'in connected collaborative editors.',
		paramsSchema: {
			id: z.string().describe('Resume ID'),
			ops: z.array(resumePatchOpSchema).min(1).describe('Ordered patch operations'),
		},
		annotations: {
			destructiveHint: true,
			idempotentHint: false,
		},
	})
	async patchResume(
		{ id, ops }: McpToolParams<{ id: string; ops: ResumePatchOp[] }>,
		{ user }: McpExtra,
	): Promise<CallToolResult> {
		await this.resumesService.find(user.sub, id);
		const result = await this.crdtApiService.applyResumePatch(`resume:${id}`, user.sub, ops);

		return {
			content: [{ type: 'text', text: `Patched resume ${id}.` }],
			structuredContent: { resume: result.resume },
		};
	}

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
			'Saves a resume to the database. If an id is provided, updates the existing resume; otherwise creates a new one. ' +
			'Updates to an existing resume are applied through the collaborative document, so changes appear live in ' +
			'connected editors. Prefer patch_resume for small, targeted edits.',
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
		if (!id) {
			const savedResume = await this.resumesService.create(user.sub, resume);

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

		await this.resumesService.find(user.sub, id);

		const ops: ResumePatchOp[] = Object.entries(resume)
			.filter(([key]) => key !== 'id')
			.map(([key, value]) => ({ op: 'set', path: key, value }));

		const result = await this.crdtApiService.applyResumePatch(`resume:${id}`, user.sub, ops);

		return {
			content: [
				{
					type: 'text',
					text: `Resume saved successfully. ID: ${id}`,
				},
			],
			structuredContent: {
				resume: result.resume,
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
