import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/index.js';
import { BulletsResolver } from './bullets.resolver.js';
import { BulletsService } from './bullets.service.js';

@Module({
	imports: [PrismaModule],
	providers: [BulletsResolver, BulletsService],
	exports: [BulletsService],
})
export class BulletsModule {}
