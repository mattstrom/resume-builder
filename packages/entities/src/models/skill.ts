import { Field, ID, InputType, ObjectType, OmitType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { z } from 'zod';

@Schema({ versionKey: false })
@ObjectType({ description: 'Skill' })
export class Skill {
	@Field(() => ID)
	_id: string;

	@Field()
	@Prop({ type: String, default: '' })
	name: string;

	@Field()
	@Prop({ type: String, default: '' })
	category: string;
}

@InputType()
export class SkillInput extends OmitType(Skill, ['_id'] as const) {
	@Field(() => ID, { nullable: true })
	_id?: string;
}

export const SkillSchema = SchemaFactory.createForClass(Skill);

export const skillSchema = z.object({
	_id: z.any(),
	name: z.string(),
	category: z.string(),
});
