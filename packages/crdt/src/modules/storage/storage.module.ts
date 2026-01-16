import { Module } from '@nestjs/common';
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
import { StorageService } from './storage.service.js';

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
	providers: [StorageService],
	exports: [],
})
export class StorageModule {}
