import { Module } from '@nestjs/common';

import { ConceptsModule } from '../../concepts/concepts.module.js';
import { SkillsResolver } from './skills.resolver.js';
import { SkillsService } from './skills.service.js';

@Module({
	imports: [ConceptsModule],
	providers: [SkillsResolver, SkillsService],
	exports: [SkillsService],
})
export class SkillsModule {}
