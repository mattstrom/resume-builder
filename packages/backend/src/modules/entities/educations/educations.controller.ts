import { Controller, Get } from '@nestjs/common';
import { EducationsService } from './educations.service';

@Controller('educations')
export class EducationsController {
	constructor(private readonly educationsService: EducationsService) {}

	@Get()
	findAll() {
		return this.educationsService.findAll();
	}
}
