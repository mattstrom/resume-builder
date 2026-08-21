import type { Job } from 'bullmq';

import type { MastraResumeSummarizerService } from './mastra-resume-summarizer.service.js';
import type { ResumeSummaryDocumentsService } from './resume-summary-documents.service.js';
import type { ResumeSummaryQueueService } from './resume-summary-queue.service.js';
import type { EmbeddingQueueService } from '../embeddings/embedding-queue.service.js';
import { ResumeSummaryProcessor } from './resume-summary.processor.js';
import type { GenerateResumeSummaryJobData } from './resume-summary.types.js';

jest.mock('../../prisma/index.js', () => ({ PrismaService: class {} }));

describe('ResumeSummaryProcessor', () => {
	const sourceUpdatedAt = '2026-08-21T08:00:00.000Z';
	const documents = {
		findStaleTargets: jest.fn(),
		loadDocument: jest.fn(),
		saveIfCurrent: jest.fn(),
	};
	const queue = { enqueueMany: jest.fn() };
	const summarizer = { summarize: jest.fn() };
	const embeddings = { enqueue: jest.fn() };
	let processor: ResumeSummaryProcessor;

	beforeEach(() => {
		jest.clearAllMocks();
		documents.saveIfCurrent.mockResolvedValue(2);
		processor = new ResumeSummaryProcessor(
			documents as unknown as ResumeSummaryDocumentsService,
			queue as unknown as ResumeSummaryQueueService,
			summarizer as unknown as MastraResumeSummarizerService,
			embeddings as unknown as EmbeddingQueueService,
		);
	});

	it('summarizes the current canonical resume revision', async () => {
		documents.loadDocument.mockResolvedValue({
			resumeId: 'resume-1',
			uid: 'auth0|test',
			name: 'Platform resume',
			company: '',
			sourceUpdatedAt,
			content: { summary: 'Backend engineer', projects: [] },
		});
		summarizer.summarize.mockResolvedValue({
			dominantTheme: 'backend/platform engineering',
			summaryTheme: 'Reliable services',
			projects: [],
			technologies: ['TypeScript'],
			contentThemes: ['distributed systems'],
		});

		await processor.process({
			name: 'generate',
			data: { resumeId: 'resume-1', sourceUpdatedAt },
		} as Job<GenerateResumeSummaryJobData>);

		expect(documents.saveIfCurrent).toHaveBeenCalledWith(
			'resume-1',
			sourceUpdatedAt,
			expect.objectContaining({
				dominantTheme: 'backend/platform engineering',
			}),
		);
		expect(embeddings.enqueue).toHaveBeenCalledWith({
			entityType: 'resume',
			entityId: 'resume-1',
			revision: 2,
			profile: 'resume-search:v1',
		});
	});

	it('does not spend a model call on a superseded revision', async () => {
		documents.loadDocument.mockResolvedValue({
			resumeId: 'resume-1',
			uid: 'auth0|test',
			name: 'Platform resume',
			company: '',
			sourceUpdatedAt: '2026-08-21T08:05:00.000Z',
			content: {},
		});

		await processor.process({
			name: 'generate',
			data: { resumeId: 'resume-1', sourceUpdatedAt },
		} as Job<GenerateResumeSummaryJobData>);

		expect(summarizer.summarize).not.toHaveBeenCalled();
		expect(documents.saveIfCurrent).not.toHaveBeenCalled();
	});
});
