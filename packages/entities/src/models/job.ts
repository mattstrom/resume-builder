import { Field, ID, InputType, ObjectType, OmitType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { z } from 'zod';

@Schema({ versionKey: false })
@ObjectType({ description: 'Job' })
export class Job {
	@Field(() => ID)
	_id: string;

	@Field()
	@Prop({ type: String, default: '' })
	company: string;

	@Field()
	@Prop({ type: String, default: '' })
	position: string;

	@Field()
	@Prop({ type: String, default: '' })
	location: string;

	@Field()
	@Prop({ type: String, default: '' })
	startDate: string;

	@Field()
	@Prop({ type: String, required: false })
	endDate?: string;

	@Field(() => [String])
	@Prop({ type: [String], default: [] })
	responsibilities: string[];
}

@InputType()
export class JobInput extends OmitType(Job, ['_id'] as const, InputType) {
	@Field(() => ID, { nullable: true })
	_id?: string;
}

export const JobSchema = SchemaFactory.createForClass(Job);

export const jobSchema = z.object({
	_id: z.any(),
	__v: z.number().optional(),
	company: z.string(),
	position: z.string(),
	location: z.string(),
	startDate: z.string(),
	endDate: z.string().optional(),
	responsibilities: z.array(z.string()),
});
