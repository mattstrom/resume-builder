import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ResumesService } from './resumes.service';
import { Resume } from '@resume-builder/entities';

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

	@Post()
	async createResume(@Body() resumeData: Resume) {
		return this.resumesService.create(resumeData);
	}

	@Put(':id')
	async updateResume(@Param('id') id: string, @Body() resumeData: Resume) {
		return this.resumesService.update(id, resumeData);
	}
}
