import { fastembed } from '@mastra/fastembed';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EmbeddingService {
	async embed(text: string): Promise<number[]> {
		const { embeddings } = await fastembed.base.doEmbed({ values: [text] });

		return embeddings[0];
	}
}
