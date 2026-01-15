import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { z } from 'zod';

@Schema({ versionKey: false })
export class Skill {
	@Prop({ type: String, default: '' })
	name: string;

	@Prop({ type: String, default: '' })
	category: string;
}

export const SkillSchema = SchemaFactory.createForClass(Skill);

export const skillSchema = z.object({
	_id: z.any(),
	name: z.string(),
	category: z.string(),
});
