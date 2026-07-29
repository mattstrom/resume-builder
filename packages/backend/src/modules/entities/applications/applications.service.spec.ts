import type { ApplicationInput } from '@resume-builder/entities';

import type { PrismaService } from '../../prisma';
import type { CompaniesService } from '../companies/companies.service';
import type { ResumesService } from '../resumes/resumes.service';
import { ApplicationsService } from './applications.service';

jest.mock('../../prisma/index.js', () => ({ PrismaService: class {} }));
jest.mock('../companies/companies.service.js', () => ({ CompaniesService: class {} }));
jest.mock('../resumes/resumes.service.js', () => ({ ResumesService: class {} }));

describe('ApplicationsService', () => {
	const uid = 'auth0|test';
	const applicationData: ApplicationInput = {
		name: 'Frontend Engineer',
		company: 'Acme',
		jobPostingUrl: 'https://example.com/jobs/123',
	};
	const savedApplication = {
		id: 'application-1',
		uid,
		...applicationData,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	const resumeService = {
		find: jest.fn(),
		createBlank: jest.fn(),
	};
	const companiesService = {
		find: jest.fn(),
	};
	const prisma = {
		application: {
			create: jest.fn(),
		},
	};

	let service: ApplicationsService;

	beforeEach(() => {
		jest.clearAllMocks();
		prisma.application.create.mockResolvedValue(savedApplication);
		resumeService.find.mockResolvedValue({ _id: 'base-resume-1' });
		resumeService.createBlank.mockResolvedValue({ _id: 'resume-1' });
		service = new ApplicationsService(
			resumeService as unknown as ResumesService,
			companiesService as unknown as CompaniesService,
			prisma as unknown as PrismaService,
		);
	});

	it('creates the application resume from the selected base resume', async () => {
		await service.create(uid, applicationData, true, 'base-resume-1');

		expect(resumeService.find).toHaveBeenCalledWith(uid, 'base-resume-1');
		expect(resumeService.createBlank).toHaveBeenCalledWith(uid, {
			name: 'Untitled Resume',
			company: applicationData.company,
			jobPostingUrl: applicationData.jobPostingUrl,
			base: false,
			applicationId: savedApplication.id,
			sourceResumeId: 'base-resume-1',
		});
	});

	it('creates a blank application resume when no base resume is selected', async () => {
		await service.create(uid, applicationData);

		expect(resumeService.find).not.toHaveBeenCalled();
		expect(resumeService.createBlank).toHaveBeenCalledWith(
			uid,
			expect.objectContaining({ sourceResumeId: undefined }),
		);
	});
});
