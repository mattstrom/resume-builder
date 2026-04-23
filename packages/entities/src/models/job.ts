import {
	Field,
	Float,
	ID,
	InputType,
	ObjectType,
	OmitType,
} from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { z } from 'zod';

@Schema({ versionKey: false })
@ObjectType({ description: 'Job' })
export class Job {
	@Field(() => ID)
	_id: string;

	@Field()
	@Prop({ type: String, required: true, index: true })
	uid: string;

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

	@Field({ nullable: true })
	@Prop({ type: String, required: false })
	endDate?: string;

	@Field(() => [String])
	@Prop({ type: [String], default: [] })
	responsibilities: string[];

	@Field(() => Float, { nullable: true })
	@Prop({ type: Number, required: false })
	relevance?: number;

	static isValid(data: unknown): data is Job {
		if (!data || typeof data !== 'object') return false;
		const obj = data as Record<string, unknown>;
		return (
			typeof obj.company === 'string' &&
			typeof obj.position === 'string' &&
			typeof obj.location === 'string' &&
			typeof obj.startDate === 'string' &&
			Array.isArray(obj.responsibilities)
		);
	}
}

@InputType()
export class JobInput extends OmitType(
	Job,
	['_id', 'uid'] as const,
	InputType,
) {
	@Field(() => ID, { nullable: true })
	_id?: string;
}

export const JobSchema = SchemaFactory.createForClass(Job);

export const jobSchema = z.object({
	_id: z.any(),
	uid: z.string(),
	__v: z.number().optional(),
	company: z.string(),
	position: z.string(),
	location: z.string(),
	startDate: z.string(),
	endDate: z.string().optional(),
	responsibilities: z.array(z.string()),
	relevance: z.number().min(0).max(1).optional(),
});
