import { Module } from '@nestjs/common';

import { ConceptsModule } from '../concepts/concepts.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { EmbeddingsModule } from '../queue/embeddings/embeddings.module.js';
import { JobRequirementsResolver } from './job-requirements.resolver.js';
import { JobRequirementsService } from './job-requirements.service.js';

@Module({
	imports: [PrismaModule, EmbeddingsModule, ConceptsModule],
	providers: [JobRequirementsResolver, JobRequirementsService],
	exports: [JobRequirementsService],
})
export class JobRequirementsModule {}
