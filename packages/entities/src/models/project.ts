import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { z } from 'zod';

@Schema({ versionKey: false })
export class Project {
	@Prop({ type: String, default: '' })
	name: string;

	@Prop({ type: [String], default: [] })
	technologies: string[];

	@Prop({ type: [String], default: [] })
	items: string[];
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

export const projectSchema = z.object({
	_id: z.any(),
	name: z.string(),
	technologies: z.array(z.string()),
	items: z.array(z.string()),
});
