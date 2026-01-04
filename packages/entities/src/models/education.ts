import { getModelForClass, modelOptions, prop } from '@typegoose/typegoose';
import { z } from 'zod';

@modelOptions({ schemaOptions: { versionKey: false } })
export class Education {
	@prop({ type: String })
	degree: string = '';

	@prop({ type: String })
	field: string = '';

	@prop({ type: String })
	institution: string = '';

	@prop({ type: String })
	graduated: string = '';
}

export const EducationModel = getModelForClass(Education);

export const educationSchema = z.object({
	_id: z.any(),
	degree: z.string(),
	field: z.string(),
	institution: z.string(),
	graduated: z.string(),
});
