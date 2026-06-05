import { Module } from '@nestjs/common';

import { SkillsResolver } from './skills.resolver.js';
import { SkillsService } from './skills.service.js';

@Module({
	providers: [SkillsResolver, SkillsService],
	exports: [SkillsService],
})
export class SkillsModule {}
