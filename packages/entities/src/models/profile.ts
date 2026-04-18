import {
	Field,
	ID,
	InputType,
	ObjectType,
	OmitType,
	PartialType,
} from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import GraphQLJSON from 'graphql-type-json';
import { HydratedDocument } from 'mongoose';
import { z } from 'zod';

export type ProfileDocument = HydratedDocument<Profile>;

@Schema({ versionKey: false, timestamps: true })
@ObjectType({ description: 'User Profile' })
export class Profile {
	@Field(() => ID, { description: 'Unique identifier' })
	_id: string;

	@Field({ description: 'User identifier' })
	@Prop({ type: String, required: true, unique: true, index: true })
	uid: string;

	@Field({
		description:
			'Narrative description of the user`s work history and background',
	})
	@Prop({ type: String, default: '' })
	narrative: string;

	@Field(() => GraphQLJSON, {
		description: 'Structured job search preferences',
	})
	@Prop({ type: Object, default: {} })
	jobPreferences: Record<string, unknown>;

	@Field({ description: 'Date when the profile was created' })
	createdAt: Date;

	@Field({ description: 'Date when the profile was last updated' })
	updatedAt: Date;
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);

export const profileSchema = z.object({
	_id: z.any().describe('Unique identifier'),
	uid: z.string().describe('User identifier'),
	narrative: z
		.string()
		.describe('Narrative description of the user`s work history'),
	jobPreferences: z
		.record(z.string(), z.unknown())
		.describe('Structured job search preferences'),
	createdAt: z.iso.datetime().describe('Date when the profile was created'),
	updatedAt: z.iso
		.datetime()
		.describe('Date when the profile was last updated'),
});

@InputType()
export class ProfileInput extends OmitType(
	Profile,
	['_id', 'uid', 'createdAt', 'updatedAt'] as const,
	InputType,
) {}

@InputType()
export class ProfileUpdateInput extends PartialType(ProfileInput) {}
