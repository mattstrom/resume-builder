import { Field, ID, InputType, ObjectType, OmitType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { z } from 'zod';

@Schema({ versionKey: false })
@ObjectType({ description: 'Education' })
export class Education {
	@Field(() => ID)
	_id: string;

	@Field()
	@Prop({ type: String, required: true, index: true })
	uid: string;

	@Field()
	@Prop({ type: String, default: '' })
	degree: string;

	@Field()
	@Prop({ type: String, default: '' })
	field: string;

	@Field()
	@Prop({ type: String, default: '' })
	institution: string;

	@Field()
	@Prop({ type: String, default: '' })
	graduated: string;

	static isValid(data: unknown): data is Education {
		if (!data || typeof data !== 'object') return false;
		const obj = data as Record<string, unknown>;
		return (
			typeof obj.degree === 'string' &&
			typeof obj.field === 'string' &&
			typeof obj.institution === 'string' &&
			typeof obj.graduated === 'string'
		);
	}
}

@InputType()
export class EducationInput extends OmitType(
	Education,
	['_id', 'uid'] as const,
	InputType,
) {
	@Field(() => ID, { nullable: true })
	_id?: string;
}

export const EducationSchema = SchemaFactory.createForClass(Education);

export const educationSchema = z.object({
	_id: z.any(),
	uid: z.string(),
	degree: z.string(),
	field: z.string(),
	institution: z.string(),
	graduated: z.string(),
});
