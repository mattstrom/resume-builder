import { getModelForClass, modelOptions, prop } from '@typegoose/typegoose';
import { z } from 'zod';

@modelOptions({ schemaOptions: { versionKey: false } })
export class Project {
	@prop({ type: String })
	name: string = '';

	@prop({ type: [String] })
	technologies: string[] = [];

	@prop({ type: [String] })
	items: string[] = [];
}

export const ProjectModel = getModelForClass(Project);

export const projectSchema = z.object({
	_id: z.any(),
	name: z.string(),
	technologies: z.array(z.string()),
	items: z.array(z.string()),
});
