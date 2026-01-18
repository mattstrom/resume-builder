import { Field, ID, InputType, ObjectType, OmitType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { z } from 'zod';

@Schema({ versionKey: false })
@ObjectType({ description: 'Skill Group' })
export class SkillGroup {
	@Field(() => ID)
	_id: string;

	@Field()
	@Prop({ type: String, default: '' })
	name: string;

	@Field(() => [String])
	@Prop({ type: [String], default: [] })
	items: string[];
}

@InputType()
export class SkillGroupInput extends OmitType(
	SkillGroup,
	['_id'] as const,
	InputType,
) {
	@Field(() => ID, { nullable: true })
	_id?: string;
}
export const SkillGroupSchema = SchemaFactory.createForClass(SkillGroup);

export const skillGroupSchema = z.object({
	_id: z.any(),
	name: z.string(),
	items: z.array(z.string()),
});
