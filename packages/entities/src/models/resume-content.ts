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

export const resumeContentSchema = z.object({
	_id: z.any(),
	name: z.string(),
	title: z.string(),
	contactInformation: contactInformationSubdocSchema,
	summary: z.string(),
	workExperience: z.array(resumeJobSchema),
	education: z.array(educationSchema),
	skills: z.array(skillSchema),
	projects: z.array(resumeProjectSchema),
	volunteering: z.array(resumeVolunteeringSchema).optional(),
});
