import type { PrismaService } from '../prisma/index.js';
import { ConceptEvidenceAssessmentsService } from './concept-evidence-assessments.service.js';

jest.mock('../prisma/index.js', () => ({ PrismaService: class {} }));

const result = {
	evaluations: [
		{
			conceptId: 'typescript',
			grade: 'strong',
			score: 0.9,
			evidenceItemIds: ['skill-group-0-item-0'],
			rationale: 'TypeScript is explicitly listed.',
		},
	],
	summary: 'Strong evidence.',
};

describe('ConceptEvidenceAssessmentsService', () => {
	const prisma = {
		application: { findFirst: jest.fn() },
		resume: { findFirst: jest.fn() },
		conceptEvidenceAssessment: {
			findFirst: jest.fn(),
			upsert: jest.fn(),
		},
	};
	let service: ConceptEvidenceAssessmentsService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new ConceptEvidenceAssessmentsService(
			prisma as unknown as PrismaService,
		);
		prisma.application.findFirst.mockResolvedValue({ id: 'application-1' });
		prisma.resume.findFirst.mockResolvedValue({
			id: 'resume-1',
			applicationId: 'application-1',
		});
		prisma.conceptEvidenceAssessment.upsert.mockImplementation(
			async ({ create }) => ({ id: 'assessment-1', ...create }),
		);
	});

	it('loads only the current user application resume assessment', async () => {
		await service.find('user-1', 'application-1', 'resume-1');

		expect(prisma.conceptEvidenceAssessment.findFirst).toHaveBeenCalledWith(
			{
				where: {
					uid: 'user-1',
					applicationId: 'application-1',
					resumeId: 'resume-1',
				},
			},
		);
	});

	it('upserts a validated assessment for an owned application resume', async () => {
		const inputHash = 'a'.repeat(64);

		await service.upsert(
			'user-1',
			'application-1',
			'resume-1',
			inputHash,
			1,
			result,
		);

		expect(prisma.conceptEvidenceAssessment.upsert).toHaveBeenCalledWith({
			where: {
				uid_applicationId_resumeId: {
					uid: 'user-1',
					applicationId: 'application-1',
					resumeId: 'resume-1',
				},
			},
			create: {
				uid: 'user-1',
				applicationId: 'application-1',
				resumeId: 'resume-1',
				inputHash,
				evaluatorVersion: 1,
				result,
			},
			update: { inputHash, evaluatorVersion: 1, result },
		});
	});

	it('rejects a resume belonging to another application', async () => {
		prisma.resume.findFirst.mockResolvedValue({
			id: 'resume-1',
			applicationId: 'application-2',
		});

		await expect(
			service.upsert(
				'user-1',
				'application-1',
				'resume-1',
				'a'.repeat(64),
				1,
				result,
			),
		).rejects.toThrow('Application resume not found');
		expect(prisma.conceptEvidenceAssessment.upsert).not.toHaveBeenCalled();
	});
});
