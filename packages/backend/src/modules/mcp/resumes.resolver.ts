import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Resolver, Tool } from '@nestjs-mcp/server';
import { InjectModel } from '@nestjs/mongoose';
import {
	ContactInformation,
	CoverLetter,
	coverLetterSchema,
	Education,
	Job,
	Project,
	Resume,
	resumeSchema,
	Skill,
} from '@resume-builder/entities';
import { Model } from 'mongoose';
import { z } from 'zod';

const getSkillsSchema = {
	categories: z.array(z.string()).optional(),
};

@Resolver()
export class ResumesResolver {
	constructor(
		@InjectModel(Resume.name) private readonly resumeModel: Model<Resume>,
		@InjectModel(ContactInformation.name) private readonly contactInfoModel:
			Model<ContactInformation>,
		@InjectModel(Job.name) private readonly jobModel: Model<Job>,
		@InjectModel(Skill.name) private readonly skillModel: Model<Skill>,
		@InjectModel(Project.name) private readonly projectModel: Model<
			Project
		>,
		@InjectModel(Education.name) private readonly educationModel: Model<
			Education
		>,
		@InjectModel(CoverLetter.name) private readonly coverLetterModel: Model<
			CoverLetter
		>,
	) {}

	/**
	 * Simple health check tool
	 */
	@Tool({
		name: 'get_resumes',
		annotations: {
			destructureHint: false,
			idempotentHint: true,
		},
	})
	async getResumes(): Promise<CallToolResult> {
		const resumes = await this.resumeModel.find().exec();

		return {
			content: [
				{
					type: 'text',
					text: `Found ${resumes.length} resumes.`,
				},
			],
			structuredContent: {
				resumes,
			},
		};
	}

	@Tool({
		name: 'save_resume',
		description: 'Saves a resume to the database',
		paramsSchema: { resume: resumeSchema },
		annotations: {
			destructureHint: true,
			idempotentHint: false,
		},
	})
	async saveResume({ resume }: { resume: Resume }) {
		const savedResume = await this.resumeModel.create(resume);

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
	async getContactInformation(): Promise<CallToolResult> {
		const contactInfo = await this.contactInfoModel.findOne().exec();

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
	async getJobs(): Promise<CallToolResult> {
		const jobs = await this.jobModel.find().exec();

		return {
			content: [
				{
					type: 'text',
					text: `Found ${jobs.length} job listings.`,
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
	async getEducation(): Promise<CallToolResult> {
		const education = await this.educationModel.find().exec();

		return {
			content: [
				{
					type: 'text',
					text: `Found ${education.length} education entries.`,
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
	async getProjects(): Promise<CallToolResult> {
		const projects = await this.projectModel.find().exec();

		return {
			content: [
				{
					type: 'text',
					text: `Found ${projects.length} projects.`,
				},
			],
			structuredContent: {
				projects,
			},
		};
	}

	@Tool({
		name: 'get_skills',
		description: 'Retrieve skills from the database',
		paramsSchema: getSkillsSchema,
		annotations: {
			destructureHint: false,
			idempotentHint: true,
		},
	})
	async getSkills({
		categories,
	}: {
		categories?: string[];
	}): Promise<CallToolResult> {
		const query = categories && categories.length > 0
			? { category: { $in: categories } }
			: {};

		const skills = await this.skillModel.find(query).lean().exec();

		const skillsText = skills.map((skill) => skill.name).join(', ');

		return {
			content: [
				{
					type: 'text',
					text: `Skills: ${skillsText}`,
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
	async getCoverLetters(): Promise<CallToolResult> {
		const coverLetters = await this.coverLetterModel.find().exec();

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
		name: 'save_cover_letter',
		description: 'Saves a cover letter to the database',
		paramsSchema: { coverLetter: coverLetterSchema },
		annotations: {
			destructureHint: true,
			idempotentHint: false,
		},
	})
	async saveCoverLetter({ coverLetter }: { coverLetter: CoverLetter }) {
		const savedCoverLetter = await this.coverLetterModel.create(coverLetter);

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
