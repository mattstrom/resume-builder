import { Module } from '@nestjs/common';

import { CrdtClientModule } from '../../crdt-client/crdt-client.module.js';
import { ResumeXmlRepository } from './resume-xml.repository.js';
import { ResumeResolver } from './resume.resolver.js';
import { ResumesService } from './resumes.service.js';

@Module({
	imports: [CrdtClientModule],
	providers: [ResumeResolver, ResumeXmlRepository, ResumesService],
	exports: [ResumeXmlRepository, ResumesService],
})
export class ResumesModule {}
