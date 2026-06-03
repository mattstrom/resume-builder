import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { FactsController, ResumeFactsController } from './facts.controller.js';
import { FactsService } from './facts.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [FactsController, ResumeFactsController],
  providers: [FactsService],
  exports: [FactsService],
})
export class FactsModule {}
