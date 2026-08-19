import { Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';

import { EmbeddingQueueService } from './embedding-queue.service.js';
import { EMBEDDING_PROFILES } from './embedding.constants.js';

describe('EmbeddingQueueService', () => {
	const queue = {
		add: jest.fn(),
		upsertJobScheduler: jest.fn(),
	};
	let service: EmbeddingQueueService;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
		queue.add.mockResolvedValue({ id: 'job-1' });
		queue.upsertJobScheduler.mockResolvedValue(undefined);
		service = new EmbeddingQueueService(queue as unknown as Queue);
	});

	it('installs the repeatable reconciliation job', async () => {
		await service.onModuleInit();

		expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
			'embedding-reconciliation',
			{ every: 300_000 },
			expect.objectContaining({ name: 'reconcile', data: {} }),
		);
	});

	it('deduplicates one entity profile revision without suppressing newer revisions', async () => {
		const target = {
			entityType: 'bullet' as const,
			entityId: 'bullet-1',
			revision: 4,
			profile: EMBEDDING_PROFILES.bullet,
		};
		await service.enqueue(target);
		await service.enqueue({ ...target, revision: 5 });

		expect(queue.add.mock.calls[0][2].jobId).toBe('bullet--bullet-1--bullet-job-match-v1--4');
		expect(queue.add.mock.calls[1][2].jobId).toBe('bullet--bullet-1--bullet-job-match-v1--5');
	});

	it('lets writes succeed when Redis is temporarily unavailable', async () => {
		queue.add.mockRejectedValue(new Error('offline'));

		await expect(
			service.enqueue({
				entityType: 'fact',
				entityId: 'fact-1',
				revision: 1,
				profile: EMBEDDING_PROFILES.fact,
			}),
		).resolves.toBeUndefined();
	});
});
