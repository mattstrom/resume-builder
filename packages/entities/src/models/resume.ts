import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { z } from 'zod';
import {
	ResumeContent,
	ResumeContentSchema,
	resumeContentSchema,
} from './resume-content';

export type ResumeDocument = HydratedDocument<Resume>;

@Schema({ versionKey: false })
export class Resume {
	@Prop({ type: String, default: '' })
	id: string;

	@Prop({ type: String, default: '' })
	name: string;

	@Prop({ type: ResumeContentSchema, default: () => ({}) })
	data: ResumeContent;
}

export const ResumeSchema = SchemaFactory.createForClass(Resume);

export const resumeSchema = z.object({
	_id: z.any(),
	id: z.string(),
	name: z.string(),
	data: resumeContentSchema,
});
