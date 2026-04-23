import {
	Field,
	ID,
	InputType,
	ObjectType,
	OmitType,
	PartialType,
	registerEnumType,
} from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { z } from 'zod';
import { ContactInformation } from './contact-information.js';
import { Education } from './education.js';
import { Job } from './job.js';
import { Project } from './project.js';
import {
	ResumeContent,
	ResumeContentInput,
	ResumeContentSchema,
	resumeContentSchema,
} from './resume-content.js';
import { SkillGroup } from './skill-group.js';

export type ResumeDocument = HydratedDocument<Resume>;

@Schema({ versionKey: false, timestamps: true })
@ObjectType({ description: 'Resume' })
export class Resume {
	@Field(() => ID, { description: 'Unique identifier' })
	_id: string;

	@Field({ description: 'User identifier' })
	@Prop({ type: String, required: true, index: true })
	uid: string;

	@Field({ nullable: true, description: 'Resume identifier' })
	@Prop({ type: String, default: '' })
	id: string;

	@Field({ description: 'Name of the resume' })
	@Prop({ type: String, default: '' })
	name: string;

	@Field({ description: 'Company name' })
	@Prop({ type: String, default: '' })
	company: string;

	@Field({ nullable: true, description: 'Job level' })
	@Prop({ type: String })
	level: string;

	@Field({ nullable: true, description: 'URL to the job posting' })
	@Prop({ type: String, default: '' })
	jobPostingUrl: string;

	@Field({ description: 'Whether the resume is read-only' })
	@Prop({ type: Boolean, default: false })
	readOnly: boolean;

	@Field({
		description: 'Whether this is a base resume for targeted versions',
	})
	@Prop({ type: Boolean, default: false })
	base: boolean;

	@Field({ description: 'Source resume for this version' })
	@Prop({ type: Types.ObjectId, ref: 'Resume', default: null })
	sourceResume?: Resume;

	@Field(() => ResumeContent, { description: 'Resume content data' })
	@Prop({ type: ResumeContentSchema, default: () => ({}) })
	data: ResumeContent;

	@Field({ description: 'Date when the resume was created' })
	createdAt: Date;

	@Field({ description: 'Date when the resume was last updated' })
	updatedAt: Date;

	static validate(data: unknown): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (!data || typeof data !== 'object') {
			return { valid: false, errors: ['Data must be an object'] };
		}

		const resume = data as Record<string, unknown>;

		if (!resume.data || typeof resume.data !== 'object') {
			return { valid: false, errors: ['Missing "data" property'] };
		}

		const obj = resume.data as Record<string, unknown>;

		if (typeof obj.name !== 'string')
			errors.push('Missing or invalid "name" field');
		if (typeof obj.title !== 'string')
			errors.push('Missing or invalid "title" field');
		if (typeof obj.summary !== 'string')
			errors.push('Missing or invalid "summary" field');
		if (!ContactInformation.isValid(obj.contactInformation))
			errors.push('Missing or invalid "contactInformation" object');
		if (!Array.isArray(obj.workExperience)) {
			errors.push('Missing "workExperience" array');
		} else if (!obj.workExperience.every(Job.isValid)) {
			errors.push('Invalid job entry in "workExperience"');
		}
		if (!Array.isArray(obj.education)) {
			errors.push('Missing "education" array');
		} else if (!obj.education.every(Education.isValid)) {
			errors.push('Invalid entry in "education"');
		}
		if (obj.skills !== undefined && !Array.isArray(obj.skills)) {
			errors.push('Invalid "skills" field - must be an array');
		}
		if (obj.skillGroups !== undefined) {
			if (!Array.isArray(obj.skillGroups)) {
				errors.push('Invalid "skillGroups" field - must be an array');
			} else if (!obj.skillGroups.every(SkillGroup.isValid)) {
				errors.push('Invalid entry in "skillGroups"');
			}
		}
		if (!Array.isArray(obj.projects)) {
			errors.push('Missing "projects" array');
		} else if (!obj.projects.every(Project.isValid)) {
			errors.push('Invalid entry in "projects"');
		}

		return { valid: errors.length === 0, errors };
	}

	static isValid(data: unknown): data is Resume {
		return Resume.validate(data).valid;
	}
}

@InputType()
export class ResumeCreateInput {
	@Field({ description: 'Resume identifier' })
	id: string;

	@Field({ description: 'Name of the resume' })
	name: string;

	@Field({ description: 'Company name' })
	company: string;

	@Field({ nullable: true, description: 'Job level' })
	level?: string;

	@Field({ description: 'URL to the job posting' })
	jobPostingUrl: string;

	@Field({
		description: 'Whether this is a base resume for targeted versions',
	})
	base: boolean;

	@Field(() => ResumeContentInput, { description: 'Resume content data' })
	data: ResumeContentInput;
}

@InputType()
export class BlankResumeCreateInput extends OmitType(ResumeCreateInput, [
	'data',
] as const) {}

@InputType()
export class ResumeUpdateInput extends PartialType(ResumeCreateInput) {}

export enum ResumeSortBy {
	COMPANY = 'COMPANY',
	LEVEL = 'LEVEL',
	DATE = 'DATE',
}

export enum ResumeCollection {
	WORK_EXPERIENCE = 'WORK_EXPERIENCE',
	PROJECTS = 'PROJECTS',
	VOLUNTEERING = 'VOLUNTEERING',
}

registerEnumType(ResumeSortBy, {
	name: 'ResumeSortBy',
	description: 'Fields available for sorting resumes',
});

registerEnumType(ResumeCollection, {
	name: 'ResumeCollection',
	description: 'Editable nested resume collections',
});

@InputType()
export class ResumeSetFieldInput {
	@Field({ description: 'Path to the field to set' })
	path: string;
}

@InputType()
export class ResumeSortInput {
	@Field(() => ResumeSortBy, { description: 'Field to sort by' })
	field: ResumeSortBy;

	@Field({
		defaultValue: true,
		description: 'Whether to sort in ascending order',
	})
	ascending: boolean;
}

@InputType()
export class ResumeFilterInput {
	@Field({ nullable: true, description: 'Filter by base resume flag' })
	base?: boolean;

	@Field({
		nullable: true,
		description:
			'Filter by company name (case-insensitive substring match)',
	})
	company?: string;
}

@InputType()
export class ResumeAddCollectionItemInput {
	@Field(() => ResumeCollection, {
		description: 'Collection to add an item to',
	})
	collection: ResumeCollection;
}

@InputType()
export class ResumeRemoveCollectionItemInput {
	@Field(() => ResumeCollection, {
		description: 'Collection to remove an item from',
	})
	collection: ResumeCollection;

	@Field({ description: 'Index of the item to remove' })
	index: number;
}

export const ResumeSchema = SchemaFactory.createForClass(Resume);

export const resumeSchema = z.object({
	_id: z.any().describe('Unique identifier'),
	uid: z.string().describe('User identifier'),
	id: z.string().describe('Resume identifier'),
	name: z.string().describe('Name of the resume'),
	company: z.string().describe('Company name'),
	level: z.string().optional().describe('Job level'),
	jobPostingUrl: z.string().describe('URL to the job posting'),
	readOnly: z.boolean().describe('Whether the resume is read-only'),
	base: z
		.boolean()
		.describe('Whether this is a base resume for targeted versions'),
	data: resumeContentSchema.describe('Resume content data'),
	createdAt: z.iso.datetime().describe('Date when the resume was created'),
	updatedAt: z.iso
		.datetime()
		.describe('Date when the resume was last updated'),
});

export const resumeInputSchema = resumeSchema.omit({
	_id: true,
	uid: true,
});
