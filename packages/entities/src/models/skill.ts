import { getModelForClass, modelOptions, prop } from '@typegoose/typegoose';
import { z } from 'zod';

@modelOptions({ schemaOptions: { versionKey: false } })
export class Skill {
	@prop({ type: String })
	name: string = '';

	@prop({ type: String })
	category: string = '';
}

export const SkillModel = getModelForClass(Skill);

export const skillSchema = z.object({
	_id: z.any(),
	name: z.string(),
	category: z.string(),
});
