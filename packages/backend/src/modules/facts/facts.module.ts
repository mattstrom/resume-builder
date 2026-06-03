import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { FactsResolver } from './facts.resolver.js';
import { FactsService } from './facts.service.js';

@Module({
	imports: [PrismaModule],
	providers: [FactsResolver, FactsService],
	exports: [FactsService],
})
export class FactsModule {}
