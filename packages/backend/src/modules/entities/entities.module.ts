import { Module } from '@nestjs/common';
import { MongodbModule } from '../mongodb/mongodb.module';
import { ResumesModule } from './resumes/resumes.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
	imports: [MongodbModule, ResumesModule, JobsModule],
})
export class EntitiesModule {}
