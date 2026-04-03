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
	@Field(() => ID)
	_id: string;

	@Field()
	@Prop({ type: String, required: true, index: true })
	uid: string;

	@Field({ nullable: true })
	@Prop({ type: String, default: '' })
	id: string;

	@Field()
	@Prop({ type: String, default: '' })
	name: string;

	@Field()
	@Prop({ type: String, default: '' })
	company: string;

	@Field({ nullable: true })
	@Prop({ type: String })
	level: string;

	@Field({ nullable: true })
	@Prop({ type: String, default: '' })
	jobPostingUrl: string;

	@Field()
	@Prop({ type: Boolean, default: false })
	readOnly: boolean;

	@Field(() => ResumeContent)
	@Prop({ type: ResumeContentSchema, default: () => ({}) })
	data: ResumeContent;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

@InputType()
export class ResumeCreateInput {
	@Field()
	id: string;

	@Field()
	name: string;

	@Field()
	company: string;

	@Field({ nullable: true })
	level?: string;

	@Field()
	jobPostingUrl: string;

	@Field(() => ResumeContentInput)
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
	@Field()
	path: string;
}

@InputType()
export class ResumeSortInput {
	@Field(() => ResumeSortBy)
	field: ResumeSortBy;

	@Field({ defaultValue: true })
	ascending: boolean;
}

@InputType()
export class ResumeAddCollectionItemInput {
	@Field(() => ResumeCollection)
	collection: ResumeCollection;
}

@InputType()
export class ResumeRemoveCollectionItemInput {
	@Field(() => ResumeCollection)
	collection: ResumeCollection;

	@Field()
	index: number;
}

export const ResumeSchema = SchemaFactory.createForClass(Resume);

export const resumeSchema = z.object({
	_id: z.any(),
	uid: z.string(),
	id: z.string(),
	name: z.string(),
	company: z.string(),
	level: z.string().optional(),
	jobPostingUrl: z.string(),
	readOnly: z.boolean(),
	data: resumeContentSchema,
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});

export const resumeInputSchema = resumeSchema.omit({
	_id: true,
	uid: true,
});
