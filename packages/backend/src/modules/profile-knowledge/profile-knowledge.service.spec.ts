import type { FactsService } from '../facts/facts.service.js';
import type { PrismaService } from '../prisma/index.js';
import { ProfileKnowledgeService } from './profile-knowledge.service.js';

jest.mock('../prisma/index.js', () => ({ PrismaService: class {} }));

const factProposal = {
	kind: 'fact' as const,
	title: 'Add Java experience',
	rationale: 'The user explicitly stated this experience.',
	fact: {
		what: 'Has several years of Java experience.',
		meanings: [
			{
				relation: 'is-a' as const,
				concept: { vocabulary: 'fact-type' as const, key: 'skill', label: 'Skill' },
				source: 'user-feedback' as const,
				confidence: 1,
			},
			{
				relation: 'relates-to' as const,
				concept: {
					vocabulary: 'entity' as const,
					key: 'profile:candidate-profile',
					label: 'Candidate profile',
				},
				source: 'user-feedback' as const,
				confidence: 1,
			},
			{
				relation: 'uses' as const,
				concept: { vocabulary: 'technology' as const, key: 'Java', label: 'Java' },
				source: 'user-feedback' as const,
				confidence: 1,
			},
		],
	},
};

describe('ProfileKnowledgeService', () => {
	const prisma = {
		requirementGradeFeedback: {
			findFirst: jest.fn(),
			findMany: jest.fn(),
			create: jest.fn(),
		},
		profileKnowledgeProposal: {
			findFirst: jest.fn(),
			findMany: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
		},
		jobRequirementFact: { findFirst: jest.fn() },
		fact: { findFirst: jest.fn() },
		$transaction: jest.fn(async (operations: unknown[]) => Promise.all(operations)),
	};
	const factsService = { create: jest.fn() };
	let service: ProfileKnowledgeService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new ProfileKnowledgeService(
			prisma as unknown as PrismaService,
			factsService as unknown as FactsService,
		);
		prisma.jobRequirementFact.findFirst.mockResolvedValue({ id: 'requirement-1' });
		prisma.requirementGradeFeedback.create.mockResolvedValue({
			id: 'feedback-1',
			proposals: [],
		});
	});

	it('records an owned requirement grade correction as an append-only event', async () => {
		await service.recordFeedback(
			'user-1',
			'application-1',
			'requirement-1',
			'weak',
			'strong',
			'  I have several years of Java experience.  ',
		);

		expect(prisma.requirementGradeFeedback.create).toHaveBeenCalledWith({
			data: {
				uid: 'user-1',
				applicationId: 'application-1',
				jobRequirementId: 'requirement-1',
				agentGrade: 'weak',
				manualGrade: 'strong',
				explanation: 'I have several years of Java experience.',
			},
			include: { proposals: true },
		});
	});

	it('promotes an accepted fact proposal into the canonical fact graph', async () => {
		prisma.profileKnowledgeProposal.findFirst.mockResolvedValue({
			id: 'proposal-1',
			uid: 'user-1',
			kind: 'fact',
			status: 'proposed',
			payload: factProposal,
		});
		prisma.fact.findFirst.mockResolvedValue(null);
		factsService.create.mockResolvedValue({ id: 'fact-1' });
		prisma.profileKnowledgeProposal.update.mockResolvedValue({
			id: 'proposal-1',
			status: 'accepted',
			acceptedFactId: 'fact-1',
		});

		await service.resolveProposal('user-1', 'proposal-1', true);

		expect(factsService.create).toHaveBeenCalledWith(
			'user-1',
			expect.objectContaining({
				what: 'Has several years of Java experience.',
				meanings: factProposal.fact.meanings,
			}),
		);
		expect(prisma.profileKnowledgeProposal.update).toHaveBeenCalledWith({
			where: { id: 'proposal-1' },
			data: expect.objectContaining({
				status: 'accepted',
				acceptedFactId: 'fact-1',
			}),
		});
	});

	it('does not create a duplicate fact when an exact confirmed claim exists', async () => {
		prisma.profileKnowledgeProposal.findFirst.mockResolvedValue({
			id: 'proposal-1',
			uid: 'user-1',
			kind: 'fact',
			status: 'proposed',
			payload: factProposal,
		});
		prisma.fact.findFirst.mockResolvedValue({ id: 'fact-existing' });
		prisma.profileKnowledgeProposal.update.mockResolvedValue({ id: 'proposal-1' });

		await service.resolveProposal('user-1', 'proposal-1', true);

		expect(factsService.create).not.toHaveBeenCalled();
		expect(prisma.profileKnowledgeProposal.update).toHaveBeenCalledWith({
			where: { id: 'proposal-1' },
			data: expect.objectContaining({ acceptedFactId: 'fact-existing' }),
		});
	});
});
