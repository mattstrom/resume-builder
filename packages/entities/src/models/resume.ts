import { getModelForClass, modelOptions, prop } from '@typegoose/typegoose';
import { Types } from 'mongoose';
import { Base } from '@typegoose/typegoose/lib/defaultClasses';

import { z } from 'zod';
import { ResumeContent, resumeContentSchema } from './resume-content';

@modelOptions({ schemaOptions: { versionKey: false } })
export class Resume implements Base {
	@prop({ type: Types.ObjectId })
	_id: Types.ObjectId;

	@prop({ type: String })
	id: string = '';

	@prop({ type: String })
	name: string = '';

	@prop({ type: () => ResumeContent })
	data: ResumeContent = new ResumeContent();
}

export const ResumeModel = getModelForClass(Resume);

export const resumeSchema = z.object({
	_id: z.any(),
	__v: z.number().optional(),
	id: z.string(),
	name: z.string(),
	data: resumeContentSchema,
});
