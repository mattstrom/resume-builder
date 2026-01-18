import { Field, ID, InputType, ObjectType, OmitType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { z } from 'zod';

@Schema({ versionKey: false })
@ObjectType({ description: 'Project' })
export class Project {
	@Field(() => ID)
	_id: string;

	@Field()
	@Prop({ type: String, default: '' })
	name: string;

	@Field(() => [String])
	@Prop({ type: [String], default: [] })
	technologies: string[];

	@Field(() => [String])
	@Prop({ type: [String], default: [] })
	items: string[];
}

@InputType()
export class ProjectInput extends OmitType(
	Project,
	['_id'] as const,
	InputType,
) {
	@Field(() => ID, { nullable: true })
	_id?: string;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

export const projectSchema = z.object({
	_id: z.any(),
	name: z.string(),
	technologies: z.array(z.string()),
	items: z.array(z.string()),
});
