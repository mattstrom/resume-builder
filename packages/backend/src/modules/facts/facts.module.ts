import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { EmbeddingService } from './embedding.service.js';
import { FactsResolver } from './facts.resolver.js';
import { FactsService } from './facts.service.js';

@Module({
	imports: [PrismaModule],
	providers: [EmbeddingService, FactsResolver, FactsService],
	exports: [EmbeddingService, FactsService],
})
export class FactsModule {}
