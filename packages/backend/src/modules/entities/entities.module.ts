import { Module } from '@nestjs/common';

import { MongodbModule } from '../mongodb/mongodb.module.js';
import { FactsModule } from '../facts/facts.module.js';
import { ApplicationsModule } from './applications/applications.module.js';
import { ContactInformationModule } from './contact-information/contact-information.module.js';
import { ConversationsModule } from './conversations/conversations.module.js';
import { CoverLettersModule } from './cover-letters/cover-letters.module.js';
import { EducationsModule } from './educations/educations.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { ProfilesModule } from './profiles/profiles.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { ResumesModule } from './resumes/resumes.module.js';
import { SkillsModule } from './skills/skills.module.js';
import { VolunteeringModule } from './volunteering/volunteering.module.js';

const imports = [
	MongodbModule,
	FactsModule,
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
