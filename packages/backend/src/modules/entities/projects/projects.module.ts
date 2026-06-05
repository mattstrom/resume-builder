import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Project, ProjectSchema } from '@resume-builder/entities';

import { ProjectsController } from './projects.controller.js';
import { ProjectsResolver } from './projects.resolver.js';
import { ProjectsService } from './projects.service.js';

@Module({
	imports: [MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }])],
	controllers: [ProjectsController],
	providers: [ProjectsResolver, ProjectsService],
	exports: [ProjectsService],
})
export class ProjectsModule {}
