import type { LlmRequestOptions, LlmStreamEvent } from './llm-types.js';

export interface LlmProvider {
	readonly name: string;
	stream(options: LlmRequestOptions): AsyncIterable<LlmStreamEvent>;
}
