import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { EmbeddingsModule } from '../queue/embeddings/embeddings.module.js';
import { JobRequirementsService } from './job-requirements.service.js';

@Module({
	imports: [PrismaModule, EmbeddingsModule],
	providers: [JobRequirementsService],
	exports: [JobRequirementsService],
})
export class JobRequirementsModule {}
