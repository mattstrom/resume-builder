import {
	Field,
	ID,
	InputType,
	ObjectType,
	OmitType,
	PartialType,
} from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { z } from 'zod';
import {
	ResumeContent,
	ResumeContentInput,
	ResumeContentSchema,
	resumeContentSchema,
} from './resume-content';

export type ResumeDocument = HydratedDocument<Resume>;

@Schema({ versionKey: false })
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

	@Field(() => ResumeContent)
	@Prop({ type: ResumeContentSchema, default: () => ({}) })
	data: ResumeContent;
}

@InputType()
export class ResumeCreateInput {
	@Field()
	id: string;

	@Field()
	name: string;

	@Field(() => ResumeContentInput)
	data: ResumeContentInput;
}

@InputType()
export class ResumeUpdateInput extends PartialType(ResumeCreateInput) {}

export const ResumeSchema = SchemaFactory.createForClass(Resume);

export const resumeSchema = z.object({
	_id: z.any(),
	id: z.string(),
	name: z.string(),
	data: resumeContentSchema,
});
