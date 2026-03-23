import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../auth';
import { EducationsService } from './educations.service';

@Controller('educations')
export class EducationsController {
	constructor(private readonly educationsService: EducationsService) {}

	@Get()
	findAll(@CurrentUser('sub') uid: string) {
		return this.educationsService.findAll(uid);
	}
}
