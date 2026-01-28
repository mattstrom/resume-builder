import { Field, ID, InputType, ObjectType, OmitType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { z } from 'zod';

@Schema({ versionKey: false })
@ObjectType({ description: 'Volunteering' })
export class Volunteering {
	@Field(() => ID)
	_id: string;

	@Field({ nullable: true })
	@Prop({ type: String, required: false })
	organization?: string;

	@Field()
	@Prop({ type: String, default: '' })
	position: string;

	@Field({ nullable: true })
	@Prop({ type: String, required: false })
	location?: string;

	@Field()
	@Prop({ type: String, default: '' })
	startDate: string;

	@Field({ nullable: true })
	@Prop({ type: String, required: false })
	endDate?: string;

	@Field(() => [String])
	@Prop({ type: [String], default: [] })
	responsibilities: string[];
}

@InputType()
export class VolunteeringInput extends OmitType(
	Volunteering,
	['_id'] as const,
	InputType,
) {
	@Field(() => ID, { nullable: true })
	_id?: string;
}

export const VolunteeringSchema = SchemaFactory.createForClass(Volunteering);

export const volunteeringSchema = z.object({
	_id: z.any(),
	__v: z.number().optional(),
	organization: z.string().optional(),
	position: z.string(),
	location: z.string().optional(),
	startDate: z.string(),
	endDate: z.string().optional(),
	responsibilities: z.array(z.string()),
});
