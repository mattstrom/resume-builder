import { getModelForClass, modelOptions, prop } from '@typegoose/typegoose';
import { z } from 'zod';
import {
	ContactInformation,
	contactInformationSchema,
} from './contact-information';
import { Education, educationSchema } from './education';
import { Job, jobSchema } from './job';
import { Project, projectSchema } from './project';
import { Skill, skillSchema } from './skill';

@modelOptions({ schemaOptions: { versionKey: false } })
export class ResumeContent {
	@prop({ type: String })
	name: string = '';

	@prop({ type: String })
	title: string = '';

	@prop({ type: () => ContactInformation })
	contactInformation: ContactInformation = new ContactInformation();

	@prop({ type: String })
	summary: string = '';

	@prop({ type: () => [Job] })
	workExperience: Job[] = [];

	@prop({ type: () => [Education] })
	education: Education[] = [];

	@prop({ type: () => [Skill] })
	skills: Skill[] = [];

	@prop({ type: () => [Project] })
	projects: Project[] = [];
}

export const ResumeContentModel = getModelForClass(ResumeContent);

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
