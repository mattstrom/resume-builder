import { Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';

import { ResumeSummaryQueueService } from './resume-summary-queue.service.js';

describe('ResumeSummaryQueueService', () => {
	const queue = {
		add: jest.fn(),
		getJob: jest.fn(),
		setGlobalConcurrency: jest.fn(),
		upsertJobScheduler: jest.fn(),
	};
	let service: ResumeSummaryQueueService;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
		queue.add.mockResolvedValue({ id: 'job-1' });
		queue.getJob.mockResolvedValue(undefined);
		queue.setGlobalConcurrency.mockResolvedValue(1);
		queue.upsertJobScheduler.mockResolvedValue(undefined);
		service = new ResumeSummaryQueueService(queue as unknown as Queue);
	});

	it('installs periodic stale-resume reconciliation', async () => {
		await service.onModuleInit();

		expect(queue.setGlobalConcurrency).toHaveBeenCalledWith(1);
		expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
			'resume-summary-reconciliation',
			{ every: 600_000 },
			expect.objectContaining({ name: 'reconcile', data: {} }),
		);
	});

	it('deduplicates one resume content revision without suppressing a newer revision', async () => {
		await service.enqueue({
			resumeId: 'resume-1',
			sourceUpdatedAt: '2026-08-21T08:00:00.000Z',
		});
		await service.enqueue({
			resumeId: 'resume-1',
			sourceUpdatedAt: '2026-08-21T08:05:00.000Z',
		});

		expect(queue.add.mock.calls[0][2].jobId).toBe('resume--resume-1--20260821080000000');
		expect(queue.add.mock.calls[1][2].jobId).toBe('resume--resume-1--20260821080500000');
	});

	it('lets reconciliation retry after a temporary Redis outage', async () => {
		queue.add.mockRejectedValue(new Error('offline'));

		await expect(
			service.enqueue({
				resumeId: 'resume-1',
				sourceUpdatedAt: '2026-08-21T08:00:00.000Z',
			}),
		).resolves.toBeUndefined();
	});

	it('retries a retained failed job for the same stale revision', async () => {
		const failedJob = {
			id: 'resume--resume-1--20260821080000000',
			getState: jest.fn().mockResolvedValue('failed'),
			retry: jest.fn().mockResolvedValue(undefined),
		};
		queue.getJob.mockResolvedValue(failedJob);

		await service.enqueue({
			resumeId: 'resume-1',
			sourceUpdatedAt: '2026-08-21T08:00:00.000Z',
		});

		expect(failedJob.retry).toHaveBeenCalledWith('failed');
		expect(queue.add).not.toHaveBeenCalled();
	});
});
