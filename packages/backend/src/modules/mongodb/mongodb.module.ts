import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import {
	ContactInformation,
	ContactInformationSchema,
	Education,
	EducationSchema,
	Job,
	JobSchema,
	Project,
	ProjectSchema,
	Resume,
	ResumeContent,
	ResumeContentSchema,
	ResumeSchema,
	Skill,
	SkillSchema,
} from '@resume-builder/entities';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: Resume.name, schema: ResumeSchema },
			{ name: ResumeContent.name, schema: ResumeContentSchema },
			{ name: ContactInformation.name, schema: ContactInformationSchema },
			{ name: Education.name, schema: EducationSchema },
			{ name: Job.name, schema: JobSchema },
			{ name: Project.name, schema: ProjectSchema },
			{ name: Skill.name, schema: SkillSchema },
		]),
	],
	exports: [MongooseModule],
})
export class MongodbModule {}
