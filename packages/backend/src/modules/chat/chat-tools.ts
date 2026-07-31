import type { ResumeXmlOp } from '@resume-builder/entities';

import type { CrdtApiService } from '../crdt-client/crdt-api.service.js';
import type { ContactInformationService } from '../entities/contact-information/contact-information.service.js';
import type { CoverLettersService } from '../entities/cover-letters/cover-letters.service.js';
import type { EducationsService } from '../entities/educations/educations.service.js';
import type { JobsService } from '../entities/jobs/jobs.service.js';
import type { ProjectsService } from '../entities/projects/projects.service.js';
import type { ResumesService } from '../entities/resumes/resumes.service.js';
import type { SkillsService } from '../entities/skills/skills.service.js';
import type { VolunteeringService } from '../entities/volunteering/volunteering.service.js';
import type { LlmToolDefinition } from '../llm/interfaces/llm-types.js';

export interface ChatToolServices {
	resumesService: ResumesService;
	contactInformationService: ContactInformationService;
	jobsService: JobsService;
	educationsService: EducationsService;
	projectsService: ProjectsService;
	skillsService: SkillsService;
	volunteeringService: VolunteeringService;
	coverLettersService: CoverLettersService;
	crdtApiService: CrdtApiService;
}

export const chatTools: LlmToolDefinition[] = [
	{
		name: 'get_resumes',
		description: 'Retrieve all resumes from the database',
		inputSchema: { type: 'object', properties: {} },
	},
	{
		name: 'get_resume',
		description: 'Retrieve all resumes from the database',
		inputSchema: { type: 'object', properties: {} },
	},
	{
		name: 'get_contact_information',
		description: 'Retrieve contact information from the database',
		inputSchema: { type: 'object', properties: {} },
	},
	{
		name: 'get_jobs',
		description: 'Retrieve job listings from the database',
		inputSchema: { type: 'object', properties: {} },
	},
	{
		name: 'get_education',
		description: 'Retrieve education entries from the database',
		inputSchema: { type: 'object', properties: {} },
	},
	{
		name: 'get_projects',
		description: 'Retrieve projects from the database',
		inputSchema: { type: 'object', properties: {} },
	},
	{
		name: 'get_skills',
		description: 'Retrieve skills from the database, optionally filtered by categories',
		inputSchema: {
			type: 'object',
			properties: {
				categories: {
					type: 'array',
					items: { type: 'string' },
					description: 'Optional list of skill categories to filter by',
				},
			},
		},
	},
	{
		name: 'get_cover_letters',
		description: 'Retrieve all cover letters from the database',
		inputSchema: { type: 'object', properties: {} },
	},
	{
		name: 'patch_resume',
		description:
			'Apply targeted operations to the canonical XML resume. Read the resume first, ' +
			'then target elements by their stable xml:id. Changes are immediately visible ' +
			'to connected editors.',
		inputSchema: {
			type: 'object',
			properties: {
				resumeId: {
					type: 'string',
					description: 'ID of the resume to patch',
				},
				ops: {
					type: 'array',
					description: 'Ordered list of patch operations to apply',
					items: {
						type: 'object',
						properties: {
							op: {
								type: 'string',
								enum: [
									'setText',
									'setAttribute',
									'removeAttribute',
									'insertElement',
									'removeNode',
									'moveNode',
								],
							},
							target: {
								type: 'object',
								properties: { xmlId: { type: 'string' } },
								required: ['xmlId'],
							},
							name: { type: 'string' },
							xml: { type: 'string' },
							position: {
								type: 'string',
								enum: ['append', 'prepend', 'before', 'after'],
							},
							index: {
								type: 'number',
								description: 'Destination index for moveNode',
							},
							value: {
								type: 'string',
							},
						},
						required: ['op', 'target'],
					},
				},
			},
			required: ['resumeId', 'ops'],
		},
	},
	{
		name: 'save_cover_letter',
		description: 'Save a cover letter to the database',
		inputSchema: {
			type: 'object',
			properties: {
				coverLetter: {
					type: 'object',
					description: 'The cover letter data to save',
				},
			},
			required: ['coverLetter'],
		},
	},
];

export async function executeTool(
	name: string,
	input: Record<string, unknown>,
	services: ChatToolServices,
	uid: string,
	_accessToken: string,
): Promise<string> {
	switch (name) {
		case 'get_resumes': {
			const resumes = await services.resumesService.findAll(uid);
			return JSON.stringify(resumes);
		}
		case 'get_resume': {
			const resumes = await services.resumesService.findAll(uid);
			return JSON.stringify(resumes);
		}
		case 'get_contact_information': {
			const contactInfo = await services.contactInformationService.findAll(uid);
			return JSON.stringify(contactInfo);
		}
		case 'get_jobs': {
			const jobs = await services.jobsService.findAll(uid);
			return JSON.stringify(jobs);
		}
		case 'get_education': {
			const education = await services.educationsService.findAll(uid);
			return JSON.stringify(education);
		}
		case 'get_projects': {
			const projects = await services.projectsService.findAll(uid);
			return JSON.stringify(projects);
		}
		case 'get_skills': {
			const allSkills = await services.skillsService.findAll(uid);
			const categories = input.categories as string[] | undefined;
			const skills =
				categories && categories.length > 0
					? allSkills.filter((s: any) => categories.includes(s.category))
					: allSkills;
			return JSON.stringify(skills);
		}
		case 'get_cover_letters': {
			const coverLetters = await services.coverLettersService.findAll(uid);
			return JSON.stringify(coverLetters);
		}
		case 'patch_resume': {
			const resumeId = input.resumeId as string;
			const ops = input.ops as ResumeXmlOp[];
			if (!resumeId || !Array.isArray(ops)) {
				throw new Error('patch_resume requires resumeId and ops[]');
			}
			// Confirm access before opening a WS session — gives a clean
			// error path if the LLM hallucinates an id.
			await services.resumesService.find(uid, resumeId);
			const result = await services.crdtApiService.applyResumePatch(
				`resume:${resumeId}`,
				uid,
				ops,
			);
			return JSON.stringify(result);
		}
		case 'save_cover_letter': {
			const coverLetter = await services.coverLettersService.create(
				uid,
				input.coverLetter as any,
			);
			return JSON.stringify(coverLetter);
		}
		default:
			throw new Error(`Unknown tool: ${name}`);
	}
}
