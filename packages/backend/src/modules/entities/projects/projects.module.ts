import { Module } from '@nestjs/common';

import { ProjectsController } from './projects.controller.js';
import { ProjectsResolver } from './projects.resolver.js';
import { ProjectsService } from './projects.service.js';

@Module({
	controllers: [ProjectsController],
	providers: [ProjectsResolver, ProjectsService],
	exports: [ProjectsService],
})
export class ProjectsModule {}
