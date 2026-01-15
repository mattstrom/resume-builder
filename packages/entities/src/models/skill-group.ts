import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { z } from 'zod';

@Schema({ versionKey: false })
export class SkillGroup {
	@Prop({ type: String, default: '' })
	name: string;

	@Prop({ type: [String], default: [] })
	items: string[];
}

export const SkillGroupSchema = SchemaFactory.createForClass(SkillGroup);

export const skillGroupSchema = z.object({
	_id: z.any(),
	name: z.string(),
	items: z.array(z.string()),
});
