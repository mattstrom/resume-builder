import { Module } from '@nestjs/common';

import { PrismaService } from './prisma.service.js';
import { StorageService } from './storage.service.js';

@Module({
	providers: [PrismaService, StorageService],
	exports: [StorageService],
})
export class StorageModule {}
