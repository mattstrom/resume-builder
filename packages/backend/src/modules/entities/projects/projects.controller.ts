import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../auth';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
	constructor(private readonly projectsService: ProjectsService) {}

	@Get()
	findAll(@CurrentUser('sub') uid: string) {
		return this.projectsService.findAll(uid);
	}
}
