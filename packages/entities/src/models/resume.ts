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

	@Field()
	@Prop({ type: String, default: '' })
	jobPostingUrl: string;

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

registerEnumType(ResumeSortBy, {
	name: 'ResumeSortBy',
	description: 'Fields available for sorting resumes',
});

@InputType()
export class ResumeSortInput {
	@Field(() => ResumeSortBy)
	field: ResumeSortBy;

	@Field({ defaultValue: true })
	ascending: boolean;
}

export const ResumeSchema = SchemaFactory.createForClass(Resume);

export const resumeSchema = z.object({
	_id: z.any(),
	id: z.string(),
	name: z.string(),
	company: z.string(),
	level: z.string().optional(),
	jobPostingUrl: z.string(),
	data: resumeContentSchema,
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});
