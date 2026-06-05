import { Module } from '@nestjs/common';

import { ResumeResolver } from './resume.resolver.js';
import { ResumesService } from './resumes.service.js';

@Module({
	providers: [ResumeResolver, ResumesService],
	exports: [ResumesService],
})
export class ResumesModule {}
