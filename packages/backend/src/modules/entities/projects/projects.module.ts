import { Module } from '@nestjs/common';

import { ConceptsModule } from '../../concepts/concepts.module.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsResolver } from './projects.resolver.js';
import { ProjectsService } from './projects.service.js';

@Module({
	imports: [ConceptsModule],
	controllers: [ProjectsController],
	providers: [ProjectsResolver, ProjectsService],
	exports: [ProjectsService],
})
export class ProjectsModule {}
