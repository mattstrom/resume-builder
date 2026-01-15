import { Controller, Get, Param } from '@nestjs/common';
import { ResumesService } from './resumes.service';

@Controller('resumes')
export class ResumesController {
	constructor(private readonly resumesService: ResumesService) {}

	@Get()
	async getResumes() {
		return this.resumesService.findAll();
	}

	@Get(':id')
	async getResume(@Param('id') id: string) {
		return this.resumesService.find(id);
	}
}
