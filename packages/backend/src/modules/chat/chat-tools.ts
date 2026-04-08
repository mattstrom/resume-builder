import type { LlmToolDefinition } from '../llm/interfaces/llm-types';

import type { ContactInformationService } from '../entities/contact-information/contact-information.service';
import type { CoverLettersService } from '../entities/cover-letters/cover-letters.service';
import type { EducationsService } from '../entities/educations/educations.service';
import type { JobsService } from '../entities/jobs/jobs.service';
import type { ProjectsService } from '../entities/projects/projects.service';
import type { ResumesService } from '../entities/resumes/resumes.service';
import type { SkillsService } from '../entities/skills/skills.service';
import type { VolunteeringService } from '../entities/volunteering/volunteering.service';

export interface ChatToolServices {
	resumesService: ResumesService;
	contactInformationService: ContactInformationService;
	jobsService: JobsService;
	educationsService: EducationsService;
	projectsService: ProjectsService;
	skillsService: SkillsService;
	volunteeringService: VolunteeringService;
	coverLettersService: CoverLettersService;
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
		description:
			'Retrieve skills from the database, optionally filtered by categories',
		inputSchema: {
			type: 'object',
			properties: {
				categories: {
					type: 'array',
					items: { type: 'string' },
					description:
						'Optional list of skill categories to filter by',
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
		name: 'save_resume',
		description:
			'Save a resume to the database. If an id is provided, updates the existing resume; otherwise creates a new one.',
		inputSchema: {
			type: 'object',
			properties: {
				id: {
					type: 'string',
					description: 'Optional ID of an existing resume to update',
				},
				resume: {
					type: 'object',
					description: 'The resume data to save',
				},
			},
			required: ['resume'],
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
			const contactInfo =
				await services.contactInformationService.findAll(uid);
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
					? allSkills.filter((s: any) =>
							categories.includes(s.category),
						)
					: allSkills;
			return JSON.stringify(skills);
		}
		case 'get_cover_letters': {
			const coverLetters =
				await services.coverLettersService.findAll(uid);
			return JSON.stringify(coverLetters);
		}
		case 'save_resume': {
			const id = input.id as string | undefined;
			const resume = id
				? await services.resumesService.update(
						uid,
						id,
						input.resume as any,
					)
				: await services.resumesService.create(
						uid,
						input.resume as any,
					);
			return JSON.stringify(resume);
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
