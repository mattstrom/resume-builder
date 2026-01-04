import { getModelForClass, modelOptions, prop } from '@typegoose/typegoose';
import { z } from 'zod';

@modelOptions({ schemaOptions: { versionKey: false } })
export class Job {
	@prop({ type: String })
	company: string = '';

	@prop({ type: String })
	position: string = '';

	@prop({ type: String })
	location: string = '';

	@prop({ type: String })
	startDate: string = '';

	@prop({ type: String })
	endDate?: string;

	@prop({ type: [String] })
	responsibilities: string[] = [];
}

export const JobModel = getModelForClass(Job);

export const jobSchema = z.object({
	_id: z.any(),
	__v: z.number().optional(),
	company: z.string(),
	position: z.string(),
	location: z.string(),
	startDate: z.string(),
	endDate: z.string().optional(),
	responsibilities: z.array(z.string()),
});
