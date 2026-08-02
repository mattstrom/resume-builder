import { fastembed } from '@mastra/fastembed';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EmbeddingService {
	private readonly maxBatchSize = 256;

	async embed(text: string): Promise<number[]> {
		const [embedding] = await this.embedMany([text]);
		return embedding;
	}

	async embedMany(texts: string[]): Promise<number[][]> {
		if (texts.length === 0) return [];
		const result: number[][] = [];
		for (let index = 0; index < texts.length; index += this.maxBatchSize) {
			const values = texts.slice(index, index + this.maxBatchSize);
			const { embeddings } = await fastembed.base.doEmbed({ values });
			result.push(...embeddings);
		}
		return result;
	}
}
