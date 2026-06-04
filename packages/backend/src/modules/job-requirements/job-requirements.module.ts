import { Module } from '@nestjs/common';

import { EmbeddingService } from '../facts/embedding.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { JobRequirementsService } from './job-requirements.service.js';

@Module({
	imports: [PrismaModule],
	providers: [EmbeddingService, JobRequirementsService],
	exports: [JobRequirementsService],
})
export class JobRequirementsModule {}
