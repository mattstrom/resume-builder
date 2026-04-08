import type { LlmRequestOptions, LlmStreamEvent } from './llm-types';

export interface LlmProvider {
	readonly name: string;
	stream(options: LlmRequestOptions): AsyncIterable<LlmStreamEvent>;
}
