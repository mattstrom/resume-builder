import {
	Field,
	Float,
	ID,
	InputType,
	ObjectType,
	OmitType,
} from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { z } from 'zod';

@Schema({ versionKey: false })
@ObjectType({ description: 'Project' })
export class Project {
	@Field(() => ID)
	_id: string;

	@Field()
	@Prop({ type: String, required: true, index: true })
	uid: string;

	@Field()
	@Prop({ type: String, default: '' })
	name: string;

	@Field(() => [String])
	@Prop({ type: [String], default: [] })
	technologies: string[];

	@Field(() => [String])
	@Prop({ type: [String], default: [] })
	items: string[];

	@Field({ nullable: true })
	@Prop({ type: String, required: false })
	type?: string;

	@Field(() => Float, { nullable: true })
	@Prop({ type: Number, required: false })
	relevance?: number;
}

@InputType()
export class ProjectInput extends OmitType(
	Project,
	['_id', 'uid'] as const,
	InputType,
) {
	@Field(() => ID, { nullable: true })
	_id?: string;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

export const projectSchema = z.object({
	_id: z.any(),
	uid: z.string(),
	name: z.string(),
	technologies: z.array(z.string()),
	items: z.array(z.string()),
	type: z.enum(['professional', 'personal']).optional(),
	relevance: z.number().min(0).max(1).optional(),
});
