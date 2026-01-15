import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { z } from 'zod';
import {
	ContactInformation,
	ContactInformationSchema,
	contactInformationSchema,
} from './contact-information';
import { Education, EducationSchema, educationSchema } from './education';
import { Job, JobSchema, jobSchema } from './job';
import { Project, ProjectSchema, projectSchema } from './project';
import { Skill, SkillSchema, skillSchema } from './skill';
import { SkillGroup, SkillGroupSchema } from './skill-group';

@Schema({ versionKey: false })
export class ResumeContent {
	@Prop({ type: String, default: '' })
	name: string;

	@Prop({ type: String, default: '' })
	title: string;

	@Prop({ type: ContactInformationSchema, default: () => ({}) })
	contactInformation: ContactInformation;

	@Prop({ type: String, default: '' })
	summary: string;

	@Prop({ type: [JobSchema], default: [] })
	workExperience: Job[];

	@Prop({ type: [EducationSchema], default: [] })
	education: Education[];

	@Prop({ type: [SkillSchema], default: [] })
	skills: Skill[];

	@Prop({ type: [SkillGroupSchema], default: [] })
	skillGroups: SkillGroup[];

	@Prop({ type: [ProjectSchema], default: [] })
	projects: Project[];
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
