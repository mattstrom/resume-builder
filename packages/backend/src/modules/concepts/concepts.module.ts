import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { EmbeddingsModule } from '../queue/embeddings/embeddings.module.js';
import { ConceptsResolver } from './concepts.resolver.js';
import { ConceptsService } from './concepts.service.js';

@Module({
	imports: [PrismaModule, EmbeddingsModule],
	providers: [ConceptsResolver, ConceptsService],
	exports: [ConceptsService],
})
export class ConceptsModule {}
