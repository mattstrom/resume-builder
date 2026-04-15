import { Module } from '@nestjs/common';
import { MongodbModule } from '../mongodb/mongodb.module';
import { EducationsModule } from './educations/educations.module';
import { JobsModule } from './jobs/jobs.module';
import { ResumesModule } from './resumes/resumes.module';
import { SkillsModule } from './skills/skills.module';
import { ProjectsModule } from './projects/projects.module';
import { ContactInformationModule } from './contact-information/contact-information.module';
import { VolunteeringModule } from './volunteering/volunteering.module';
import { ConversationsModule } from './conversations/conversations.module';
import { CoverLettersModule } from './cover-letters/cover-letters.module';
import { ApplicationsModule } from './applications/applications.module';
import { ProfilesModule } from './profiles/profiles.module';

const imports = [
	MongodbModule,
	ResumesModule,
	JobsModule,
	SkillsModule,
	EducationsModule,
	ProjectsModule,
	ContactInformationModule,
	ProfilesModule,
	VolunteeringModule,
	CoverLettersModule,
	ConversationsModule,
	ApplicationsModule,
];

@Module({
	imports: [...imports],
	exports: imports,
})
export class EntitiesModule {}
