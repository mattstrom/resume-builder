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

@Schema({ _id: false, versionKey: false })
@ObjectType()
export class NarrativeWorkExperience {
	@Field()
	company: string;

	@Field()
	role: string;

	@Field({ nullable: true })
	startDate?: string;

	@Field({ nullable: true })
	endDate?: string;

	@Field(() => [String])
	highlights: string[];
}

@Schema({ _id: false, versionKey: false })
@ObjectType()
export class NarrativeEducation {
	@Field()
	institution: string;

	@Field()
	degree: string;

	@Field({ nullable: true })
	field?: string;

	@Field({ nullable: true })
	graduationYear?: string;
}

@Schema({ _id: false, versionKey: false })
@ObjectType()
export class NarrativeProject {
	@Field()
	name: string;

	@Field()
	description: string;

	@Field(() => [String])
	technologies: string[];
}

@Schema({ _id: false, versionKey: false })
@ObjectType()
export class NarrativeSummary {
	@Field()
	@Prop({ type: String })
	headline: string;

	@Field()
	@Prop({ type: String })
	summary: string;

	@Field(() => [String])
	@Prop({ type: [String] })
	skills: string[];

	@Field(() => [NarrativeWorkExperience])
	@Prop({ type: [Object] })
	workExperience: NarrativeWorkExperience[];

	@Field(() => [NarrativeEducation])
	@Prop({ type: [Object] })
	education: NarrativeEducation[];

	@Field(() => [NarrativeProject])
	@Prop({ type: [Object] })
	projects: NarrativeProject[];
}

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

	@Field(() => NarrativeSummary, {
		nullable: true,
		description: 'Structured summary extracted from the narrative',
	})
	@Prop({ type: Object, default: null })
	narrativeSummary?: NarrativeSummary | null;

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

export const narrativeWorkExperienceSchema = z.object({
	company: z.string(),
	role: z.string(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	highlights: z.array(z.string()),
});

export const narrativeEducationSchema = z.object({
	institution: z.string(),
	degree: z.string(),
	field: z.string().optional(),
	graduationYear: z.string().optional(),
});

export const narrativeProjectSchema = z.object({
	name: z.string(),
	description: z.string(),
	technologies: z.array(z.string()),
});

export const narrativeSummarySchema = z.object({
	headline: z.string(),
	summary: z.string(),
	skills: z.array(z.string()),
	workExperience: z.array(narrativeWorkExperienceSchema),
	education: z.array(narrativeEducationSchema),
	projects: z.array(narrativeProjectSchema),
});

export type NarrativeSummaryData = z.infer<typeof narrativeSummarySchema>;

export const profileSchema = z.object({
	_id: z.any().describe('Unique identifier'),
	uid: z.string().describe('User identifier'),
	narrative: z
		.string()
		.describe('Narrative description of the user`s work history'),
	narrativeSummary: narrativeSummarySchema
		.nullable()
		.optional()
		.describe('Structured summary extracted from the narrative'),
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
	['_id', 'uid', 'createdAt', 'updatedAt', 'narrativeSummary'] as const,
	InputType,
) {}

@InputType()
export class ProfileUpdateInput extends PartialType(ProfileInput) {}
