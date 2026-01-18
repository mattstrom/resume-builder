import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Job, JobSchema } from '@resume-builder/entities';
import { JobsService } from './jobs.service';

@Module({
	imports: [
		MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]),
	],
	providers: [JobsService],
	exports: [JobsService],
})
export class JobsModule {}
