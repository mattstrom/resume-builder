import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { EmbeddingsModule } from '../queue/embeddings/embeddings.module.js';
import { FactsResolver } from './facts.resolver.js';
import { FactsService } from './facts.service.js';

@Module({
	imports: [PrismaModule, EmbeddingsModule],
	providers: [FactsResolver, FactsService],
	exports: [FactsService],
})
export class FactsModule {}
