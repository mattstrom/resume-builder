import { Field, ID, InputType, ObjectType, PartialType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { z } from 'zod';

@Schema({ collection: 'cover-letters', versionKey: false })
@ObjectType({ description: 'Cover Letter' })
export class CoverLetter {
	@Field(() => ID)
	_id: string;

	@Field()
	@Prop({ type: String, required: true, index: true })
	uid: string;

	@Field()
	@Prop({ type: String, default: '' })
	name: string;

	@Field()
	@Prop({ type: String, default: '' })
	company: string;

	@Field()
	@Prop({ type: String, default: '' })
	jobPostingUrl: string;

	@Field()
	@Prop({ type: String, default: '' })
	content: string;
}

@InputType()
export class CoverLetterInput {
	@Field()
	name: string;

	@Field()
	company: string;

	@Field()
	jobPostingUrl: string;

	@Field()
	content: string;
}

@InputType()
export class CoverLetterUpdateInput extends PartialType(CoverLetterInput) {}

export const CoverLetterSchema = SchemaFactory.createForClass(CoverLetter);

export const coverLetterSchema = z.object({
	_id: z.any(),
	uid: z.string(),
	name: z.string(),
	company: z.string(),
	jobPostingUrl: z.string(),
	content: z.string(),
});
