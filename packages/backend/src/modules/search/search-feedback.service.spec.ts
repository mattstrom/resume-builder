import { BadRequestException } from '@nestjs/common';

import { SearchFeedbackService } from './search-feedback.service.js';

jest.mock('../prisma/index.js', () => ({ PrismaService: class {} }));

describe('SearchFeedbackService', () => {
	const prisma = { searchResultFeedback: { upsert: jest.fn() } };
	const service = new SearchFeedbackService(prisma as never);

	beforeEach(() => jest.clearAllMocks());

	it('upserts one effective judgment per user, run, and result', async () => {
		prisma.searchResultFeedback.upsert.mockResolvedValue({
			id: 'feedback-1',
		});

		await service.upsert('auth0|owner', {
			searchRunId: 'run-1',
			query: 'platform reliability',
			resultId: 'BULLET:bullet-1',
			resultType: 'BULLET',
			rank: 0,
			agentScore: 0.91,
			relevant: true,
		});

		expect(prisma.searchResultFeedback.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					uid_searchRunId_resultId: {
						uid: 'auth0|owner',
						searchRunId: 'run-1',
						resultId: 'BULLET:bullet-1',
					},
				},
			}),
		);
	});

	it('rejects malformed feedback before writing', async () => {
		await expect(
			service.upsert('auth0|owner', {
				searchRunId: 'run-1',
				query: 'x',
				resultId: 'result-1',
				resultType: 'BULLET',
				rank: 0,
				agentScore: 2,
				relevant: false,
			}),
		).rejects.toBeInstanceOf(BadRequestException);
		expect(prisma.searchResultFeedback.upsert).not.toHaveBeenCalled();
	});
});
