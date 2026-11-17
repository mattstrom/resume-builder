import { Field, ID, InputType, ObjectType, OmitType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { z } from 'zod';

import {
	ContactInformationInput,
	contactInformationSchema,
	ContactInformationSubdoc,
	contactInformationSubdocSchema,
	ContactInformationSubdocSchema,
} from './contact-information.js';
import { Education, educationSchema, EducationSchema } from './education.js';
import { Job, JobInput, JobSchema, jobSchema } from './job.js';
import { Project, ProjectInput, ProjectSchema, projectSchema } from './project.js';
import { SkillGroup, SkillGroupInput, SkillGroupSchema } from './skill-group.js';
import { Skill, SkillInput, SkillSchema, skillSchema } from './skill.js';
import {
	Volunteering,
	VolunteeringInput,
	volunteeringSchema,
	VolunteeringSchema,
} from './volunteering.js';

@ObjectType()
export class ResumeBullet {
	@Field(() => ID)
	_id: string;

	@Field()
	text: string;

	@Field(() => ID, { nullable: true })
	bulletId?: string;
}

@ObjectType()
export class ResumeJob extends OmitType(Job, ['responsibilities'] as const) {
	@Field(() => ID, { nullable: true })
	sourceId?: string;

	@Field(() => [ResumeBullet])
	responsibilities: ResumeBullet[];
}

@ObjectType()
export class ResumeProject extends OmitType(Project, ['items'] as const) {
	@Field(() => ID, { nullable: true })
	sourceId?: string;

	@Field(() => [ResumeBullet])
	items: ResumeBullet[];
}

@ObjectType()
export class ResumeVolunteering extends OmitType(Volunteering, ['responsibilities'] as const) {
	@Field(() => ID, { nullable: true })
	sourceId?: string;

	@Field(() => [ResumeBullet])
	responsibilities: ResumeBullet[];
}

/**
 * The movable sections of a resume, named after their elements in the
 * canonical resume XML and listed in the default rendering order. The contact
 * block and headline are not listed: they always lead the document.
 */
export const RESUME_SECTION_KEYS = [
	'summary',
	'selected-experience',
	'work-experience',
	'education',
	'skills',
	'projects',
	'volunteer-experiences',
] as const;

export type ResumeSectionKey = (typeof RESUME_SECTION_KEYS)[number];

export function isResumeSectionKey(value: unknown): value is ResumeSectionKey {
	return (RESUME_SECTION_KEYS as readonly unknown[]).includes(value);
}

/**
 * Return a complete section order: unknown and repeated keys are dropped, and
 * any section the input omits is placed after the section it follows by
 * default, so partial orders from older documents stay predictable.
 */
export function normalizeResumeSectionOrder(
	order?: readonly unknown[] | null,
): ResumeSectionKey[] {
	const result: ResumeSectionKey[] = [];
	for (const key of order ?? []) {
		if (isResumeSectionKey(key) && !result.includes(key)) result.push(key);
	}
	for (const [index, key] of RESUME_SECTION_KEYS.entries()) {
		if (result.includes(key)) continue;
		const predecessor = RESUME_SECTION_KEYS.slice(0, index)
			.reverse()
			.find((candidate) => result.includes(candidate));
		result.splice(predecessor ? result.indexOf(predecessor) + 1 : 0, 0, key);
	}
	return result;
}

@Schema({ versionKey: false })
@ObjectType({ description: 'A titled group of highlights in the Selected Experience section' })
export class ResumeSelectedExperience {
	@Field(() => ID)
	_id: string;

	@Field({ nullable: true })
	@Prop({ type: String, default: '' })
	title: string;

	@Field(() => [ResumeBullet])
	@Prop({ type: [Object], default: [] })
	items: ResumeBullet[];
}

export const ResumeSelectedExperienceSchema =
	SchemaFactory.createForClass(ResumeSelectedExperience);

@InputType()
export class ResumeBulletInput {
	@Field(() => ID, { nullable: true })
	_id?: string;

	@Field()
	text: string;

	@Field(() => ID, { nullable: true })
	bulletId?: string;
}

@InputType()
export class ResumeJobInput extends OmitType(JobInput, ['responsibilities'] as const, InputType) {
	@Field(() => ID, { nullable: true })
	sourceId?: string;

	@Field(() => [ResumeBulletInput])
	responsibilities: ResumeBulletInput[];
}

@InputType()
export class ResumeProjectInput extends OmitType(ProjectInput, ['items'] as const, InputType) {
	@Field(() => ID, { nullable: true })
	sourceId?: string;

	@Field(() => [ResumeBulletInput])
	items: ResumeBulletInput[];
}

@InputType()
export class ResumeVolunteeringInput extends OmitType(
	VolunteeringInput,
	['responsibilities'] as const,
	InputType,
) {
	@Field(() => ID, { nullable: true })
	sourceId?: string;

	@Field(() => [ResumeBulletInput])
	responsibilities: ResumeBulletInput[];
}

@InputType()
export class ResumeSelectedExperienceInput {
	@Field(() => ID, { nullable: true })
	_id?: string;

	@Field()
	title: string;

	@Field(() => [ResumeBulletInput])
	items: ResumeBulletInput[];
}

@Schema({ versionKey: false })
@ObjectType({
	description: 'Content of the resume, as opposed to the Resume object which holds metadata.',
})
export class ResumeContent {
	@Field(() => ID)
	_id: string;

	@Field({ nullable: true })
	@Prop({ type: String, default: '' })
	name: string;

	@Field({ nullable: true })
	@Prop({ type: String, default: '' })
	title: string;

	@Field(() => ContactInformationSubdoc, { nullable: true })
	@Prop({ type: ContactInformationSubdocSchema, default: () => ({}) })
	contactInformation: ContactInformationSubdoc;

	@Field({ nullable: true })
	@Prop({ type: String, default: '' })
	summary: string;

	@Field(() => [ResumeSelectedExperience], { nullable: true })
	@Prop({ type: [ResumeSelectedExperienceSchema], default: [] })
	selectedExperience?: ResumeSelectedExperience[];

	@Field(() => [String], {
		nullable: true,
		description:
			'Order of the movable resume sections, derived from the resume XML document order',
	})
	@Prop({ type: [String], default: undefined })
	sectionOrder?: ResumeSectionKey[];

	@Field(() => [ResumeJob], { nullable: true })
	@Prop({ type: [JobSchema], default: [] })
	workExperience: ResumeJob[];

	@Field(() => [Education], { nullable: true })
	@Prop({ type: [EducationSchema], default: [] })
	education: Education[];

	@Field(() => [Skill], { nullable: true })
	@Prop({ type: [SkillSchema], default: [] })
	skills?: Skill[];

	@Field(() => [SkillGroup], { nullable: true })
	@Prop({ type: [SkillGroupSchema], default: [] })
	skillGroups?: SkillGroup[];

	@Field(() => [ResumeProject], { nullable: true })
	@Prop({ type: [ProjectSchema], default: [] })
	projects: ResumeProject[];

	@Field(() => [ResumeVolunteering], { nullable: true })
	@Prop({ type: [VolunteeringSchema], default: [] })
	volunteering?: ResumeVolunteering[];
}

@InputType()
export class ResumeContentInput {
	@Field(() => ID, { nullable: true })
	_id?: string;

	@Field()
	name: string;

	@Field()
	title: string;

	@Field()
	summary: string;

	@Field(() => [ResumeSelectedExperienceInput], { nullable: true })
	selectedExperience?: ResumeSelectedExperienceInput[];

	@Field(() => [String], { nullable: true })
	sectionOrder?: ResumeSectionKey[];

	@Field(() => [ResumeJobInput])
	workExperience: ResumeJobInput[];

	@Field(() => ContactInformationInput)
	contactInformation: ContactInformationInput;

	@Field(() => [ID])
	education: string[];

	@Field(() => [ResumeProjectInput])
	projects: ResumeProjectInput[];

	@Field(() => [SkillInput], { nullable: true })
	skills?: SkillInput[];

	@Field(() => [SkillGroupInput], { nullable: true })
	skillGroups?: SkillGroupInput[];

	@Field(() => [ResumeVolunteeringInput], { nullable: true })
	volunteering?: ResumeVolunteeringInput[];
}

export const ResumeContentSchema = SchemaFactory.createForClass(ResumeContent);

export const resumeBulletSchema = z.object({
	_id: z.string().optional(),
	text: z.string(),
	bulletId: z.string().optional(),
});

const resumeJobSchema = jobSchema.omit({ responsibilities: true }).extend({
	sourceId: z.string().optional(),
	responsibilities: z.array(resumeBulletSchema),
});

const resumeProjectSchema = projectSchema.omit({ items: true }).extend({
	sourceId: z.string().optional(),
	items: z.array(resumeBulletSchema),
});

const resumeVolunteeringSchema = volunteeringSchema.omit({ responsibilities: true }).extend({
	sourceId: z.string().optional(),
	responsibilities: z.array(resumeBulletSchema),
});

export const resumeSelectedExperienceSchema = z.object({
	_id: z.string().optional(),
	title: z.string(),
	items: z.array(resumeBulletSchema),
});

export const resumeContentSchema = z.object({
	_id: z.any(),
	name: z.string(),
	title: z.string(),
	contactInformation: contactInformationSubdocSchema,
	summary: z.string(),
	selectedExperience: z.array(resumeSelectedExperienceSchema).optional(),
	sectionOrder: z.array(z.enum(RESUME_SECTION_KEYS)).optional(),
	workExperience: z.array(resumeJobSchema),
	education: z.array(educationSchema),
	skills: z.array(skillSchema),
	projects: z.array(resumeProjectSchema),
	volunteering: z.array(resumeVolunteeringSchema).optional(),
});
