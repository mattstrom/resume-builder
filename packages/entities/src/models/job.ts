import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { z } from 'zod';

@Schema({ versionKey: false })
export class Job {
	@Prop({ type: String, default: '' })
	company: string;

	@Prop({ type: String, default: '' })
	position: string;

	@Prop({ type: String, default: '' })
	location: string;

	@Prop({ type: String, default: '' })
	startDate: string;

	@Prop({ type: String, required: false })
	endDate?: string;

	@Prop({ type: [String], default: [] })
	responsibilities: string[];
}

export const JobSchema = SchemaFactory.createForClass(Job);

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
