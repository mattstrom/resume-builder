import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ResumeDocument = HydratedDocument<Resume>;

@Schema()
export class Resume {
	@Prop()
	id: string;

	@Prop()
	name: string;

	@Prop({ type: Types.Map })
	data: object;
}

export const ResumeSchema = SchemaFactory.createForClass(Resume);
