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
import {
	ResumeContent,
	ResumeContentInput,
	ResumeContentSchema,
	resumeContentSchema,
} from './resume-content.js';

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

	@Field(() => ResumeContent, { description: 'Resume content data' })
	@Prop({ type: ResumeContentSchema, default: () => ({}) })
	data: ResumeContent;

	@Field({ description: 'Date when the resume was created' })
	createdAt: Date;

	@Field({ description: 'Date when the resume was last updated' })
	updatedAt: Date;
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
