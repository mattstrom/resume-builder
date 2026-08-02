import type { Job } from 'bullmq';

import { EMBEDDING_MODEL, EMBEDDING_PROFILES } from './embedding.constants.js';
import type { EmbeddingDocumentsService } from './embedding-documents.service.js';
import type { EmbeddingQueueService } from './embedding-queue.service.js';
import { EmbeddingProcessor } from './embedding.processor.js';
import type { EmbeddingService } from './embedding.service.js';
import type { GenerateEmbeddingJobData } from './embedding.types.js';

jest.mock('../../prisma/index.js', () => ({ PrismaService: class {} }));

describe('EmbeddingProcessor', () => {
	const documents = {
		findStaleTargets: jest.fn(),
		loadDocument: jest.fn(),
		saveIfCurrent: jest.fn(),
	};
	const embedding = { embed: jest.fn() };
	const queue = { enqueueMany: jest.fn() };
	let processor: EmbeddingProcessor;

	const target: GenerateEmbeddingJobData = {
		entityType: 'bullet',
		entityId: 'bullet-1',
		revision: 2,
		profile: EMBEDDING_PROFILES.bullet,
	};

	function job(
		name: string,
		data: GenerateEmbeddingJobData | Record<string, never> = target,
	): Job<GenerateEmbeddingJobData> {
		return { id: 'job-1', name, data } as Job<GenerateEmbeddingJobData>;
	}

	beforeEach(() => {
		jest.clearAllMocks();
		processor = new EmbeddingProcessor(
			documents as unknown as EmbeddingDocumentsService,
			embedding as unknown as EmbeddingService,
			queue as unknown as EmbeddingQueueService,
		);
		embedding.embed.mockResolvedValue([0.1, 0.2]);
		documents.saveIfCurrent.mockResolvedValue(true);
	});

	it('treats deleted entities as successful no-ops', async () => {
		documents.loadDocument.mockResolvedValue(null);

		await processor.process(job('generate'));

		expect(embedding.embed).not.toHaveBeenCalled();
	});

	it('does not embed a superseded revision', async () => {
		documents.loadDocument.mockResolvedValue({ ...target, revision: 3, text: 'newer' });

		await processor.process(job('generate'));

		expect(embedding.embed).not.toHaveBeenCalled();
		expect(documents.saveIfCurrent).not.toHaveBeenCalled();
	});

	it('persists through a compare-and-set update', async () => {
		documents.loadDocument.mockResolvedValue({ ...target, text: 'matching text' });

		await processor.process(job('generate'));

		expect(embedding.embed).toHaveBeenCalledWith('matching text');
		expect(documents.saveIfCurrent).toHaveBeenCalledWith(
			'bullet-1',
			2,
			EMBEDDING_PROFILES.bullet,
			EMBEDDING_MODEL,
			[0.1, 0.2],
			'bullet',
		);
	});

	it('enqueues every stale target during reconciliation', async () => {
		documents.findStaleTargets.mockResolvedValue([target]);

		await processor.process(job('reconcile', {}));

		expect(queue.enqueueMany).toHaveBeenCalledWith([target]);
	});
});
