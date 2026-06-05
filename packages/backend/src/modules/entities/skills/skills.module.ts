import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Skill, SkillSchema } from '@resume-builder/entities';

import { SkillsResolver } from './skills.resolver.js';
import { SkillsService } from './skills.service.js';

@Module({
	imports: [MongooseModule.forFeature([{ name: Skill.name, schema: SkillSchema }])],
	providers: [SkillsResolver, SkillsService],
	exports: [SkillsService],
})
export class SkillsModule {}
