import { fastembed } from '@mastra/fastembed';

import { EmbeddingService } from './embedding.service.js';

jest.mock('@mastra/fastembed', () => ({
	fastembed: { base: { doEmbed: jest.fn() } },
}));

describe('EmbeddingService', () => {
	const doEmbed = fastembed.base.doEmbed as jest.Mock;
	let service: EmbeddingService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new EmbeddingService();
		doEmbed.mockImplementation(async ({ values }: { values: string[] }) => ({
			embeddings: values.map((value) => [value.length]),
		}));
	});

	it('preserves order while splitting provider-sized batches', async () => {
		const values = Array.from({ length: 257 }, (_, index) => `value-${index}`);

		const embeddings = await service.embedMany(values);

		expect(doEmbed).toHaveBeenCalledTimes(2);
		expect(doEmbed.mock.calls[0][0].values).toHaveLength(256);
		expect(doEmbed.mock.calls[1][0].values).toEqual(['value-256']);
		expect(embeddings).toHaveLength(257);
		expect(embeddings[256]).toEqual([9]);
	});

	it('uses the same batch implementation for one query embedding', async () => {
		await expect(service.embed('search query')).resolves.toEqual([12]);
	});
});
