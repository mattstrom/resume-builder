import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Resume } from '@resume-builder/entities';

import { ResumesService } from './resumes.service.js';

describe('ResumesService', () => {
	let service: ResumesService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ResumesService,
				{
					provide: getModelToken(Resume.name),
					useValue: {
						name: 'Resume',
					},
				},
			],
		}).compile();

		service = module.get<ResumesService>(ResumesService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('createBlank()', () => {
		it('should create a blank resume', async () => {
			// Arrange

			// Act
			const resume = await service.createBlank('auth0|test', {
				id: '',
				name: 'New Resume',
				company: 'Acme',
				jobPostingUrl: '',
			});

			// Assert
			expect(resume).toBeDefined();
		});
	});
});
