import { Field, ID, InputType, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { z } from 'zod';
import {
	ContactInformation,
	ContactInformationInput,
	ContactInformationSchema,
	contactInformationSchema,
} from './contact-information';
import { Education, educationSchema, EducationSchema } from './education';
import { Job, JobInput, JobSchema, jobSchema } from './job';
import { Project, ProjectInput, ProjectSchema, projectSchema } from './project';
import { Skill, SkillInput, SkillSchema, skillSchema } from './skill';
import { SkillGroup, SkillGroupInput, SkillGroupSchema } from './skill-group';

@Schema({ versionKey: false })
@ObjectType({
	description:
		'Content of the resume, as opposed to the Resume object which holds metadata.',
})
export class ResumeContent {
	@Field(() => ID)
	_id: string;

	@Field()
	@Prop({ type: String, default: '' })
	name: string;

	@Field()
	@Prop({ type: String, default: '' })
	title: string;

	@Field(() => ContactInformation)
	@Prop({ type: ContactInformationSchema, default: () => ({}) })
	contactInformation: ContactInformation;

	@Field()
	@Prop({ type: String, default: '' })
	summary: string;

	@Field(() => [Job])
	@Prop({ type: [JobSchema], default: [] })
	workExperience: Job[];

	@Field(() => [Education])
	@Prop({ type: [EducationSchema], default: [] })
	education: Education[];

	@Field(() => [Skill], { nullable: true })
	@Prop({ type: [SkillSchema], default: [] })
	skills?: Skill[];

	@Field(() => [SkillGroup], { nullable: true })
	@Prop({ type: [SkillGroupSchema], default: [] })
	skillGroups?: SkillGroup[];

	@Field(() => [Project])
	@Prop({ type: [ProjectSchema], default: [] })
	projects: Project[];
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

	@Field(() => [JobInput])
	workExperience: JobInput[];

	@Field(() => ContactInformationInput)
	contactInformation: ContactInformationInput;

	@Field(() => [ID])
	education: string[];

	@Field(() => [ProjectInput])
	projects: ProjectInput[];

	@Field(() => [SkillInput], { nullable: true })
	skills?: SkillInput[];

	@Field(() => [SkillGroupInput], { nullable: true })
	skillGroups?: SkillGroupInput[];
}

export const ResumeContentSchema = SchemaFactory.createForClass(ResumeContent);

export const resumeContentSchema = z.object({
	_id: z.any(),
	name: z.string(),
	title: z.string(),
	contactInformation: contactInformationSchema,
	summary: z.string(),
	workExperience: z.array(jobSchema),
	education: z.array(educationSchema),
	skills: z.array(skillSchema),
	projects: z.array(projectSchema),
});
