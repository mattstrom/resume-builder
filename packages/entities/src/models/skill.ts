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
@ObjectType({ description: 'Skill' })
export class Skill {
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
	category: string;

	@Field(() => Float, { nullable: true })
	@Prop({ type: Number, required: false })
	relevance?: number;
}

@InputType()
export class SkillInput extends OmitType(
	Skill,
	['_id', 'uid'] as const,
	InputType,
) {
	@Field(() => ID, { nullable: true })
	_id?: string;
}

export const SkillSchema = SchemaFactory.createForClass(Skill);

export const skillSchema = z.object({
	_id: z.any(),
	uid: z.string(),
	name: z.string(),
	category: z.string(),
	relevance: z.number().min(0).max(1).optional(),
});
