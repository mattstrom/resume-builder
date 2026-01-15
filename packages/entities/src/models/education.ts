import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { z } from 'zod';

@Schema({ versionKey: false })
export class Education {
	@Prop({ type: String, default: '' })
	degree: string;

	@Prop({ type: String, default: '' })
	field: string;

	@Prop({ type: String, default: '' })
	institution: string;

	@Prop({ type: String, default: '' })
	graduated: string;
}

export const EducationSchema = SchemaFactory.createForClass(Education);

export const educationSchema = z.object({
	_id: z.any(),
	degree: z.string(),
	field: z.string(),
	institution: z.string(),
	graduated: z.string(),
});
