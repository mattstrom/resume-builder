import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../auth';
import { SkillsService } from './skills.service';

@Controller('skills')
export class SkillsController {
	constructor(private readonly skillsService: SkillsService) {}

	@Get()
	findAll(@CurrentUser('sub') uid: string) {
		return this.skillsService.findAll(uid);
	}
}
