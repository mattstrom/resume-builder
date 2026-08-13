import { Module } from '@nestjs/common';

import { FactsModule } from '../facts/facts.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ProfileKnowledgeResolver } from './profile-knowledge.resolver.js';
import { ProfileKnowledgeService } from './profile-knowledge.service.js';

@Module({
	imports: [PrismaModule, FactsModule],
	providers: [ProfileKnowledgeResolver, ProfileKnowledgeService],
})
export class ProfileKnowledgeModule {}
