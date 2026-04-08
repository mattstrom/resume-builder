import { Injectable } from '@nestjs/common';
import { Ollama, type Message, type Tool } from 'ollama';
import { randomUUID } from 'crypto';

import type { LlmProvider } from '../interfaces/llm-provider.interface';
import type {
	LlmContentBlock,
	LlmMessage,
	LlmRequestOptions,
	LlmStreamEvent,
	LlmToolDefinition,
} from '../interfaces/llm-types';

import configuration from '../../../configuration';

@Injectable()
export class OllamaProviderService implements LlmProvider {
	readonly name = 'ollama';
	private readonly client: Ollama;

	constructor() {
		this.client = new Ollama({ host: configuration.llms.ollama.host });
	}

	async *stream(options: LlmRequestOptions): AsyncIterable<LlmStreamEvent> {
		const messages = toOllamaMessages(options.system, options.messages);
		const tools = options.tools?.map(toOllamaTool);

		const response = await this.client.chat({
			model: options.model,
			messages,
			stream: true,
			...(tools && tools.length > 0 ? { tools } : {}),
		});

		let textPartId: string | null = null;
		let accumulatedText = '';
		const toolCalls: Array<{
			id: string;
			name: string;
			input: Record<string, unknown>;
		}> = [];

		for await (const chunk of response) {
			// Handle tool calls
			if (
				chunk.message.tool_calls &&
				chunk.message.tool_calls.length > 0
			) {
				for (const toolCall of chunk.message.tool_calls) {
					const id = randomUUID();
					toolCalls.push({
						id,
						name: toolCall.function.name,
						input: toolCall.function.arguments as Record<
							string,
							unknown
						>,
					});
				}
				continue;
			}

			// Skip thinking-only chunks (e.g. Qwen3 reasoning tokens)
			const text = chunk.message.content;
			if (!text) {
				continue;
			}

			if (!textPartId) {
				textPartId = randomUUID();
				yield { type: 'text-start', id: textPartId };
			}
			accumulatedText += text;
			yield { type: 'text-delta', id: textPartId, delta: text };
		}

		// Close text block if open
		if (textPartId) {
			yield { type: 'text-end', id: textPartId };
		}

		// Emit tool-use events
		for (const toolCall of toolCalls) {
			yield {
				type: 'tool-use',
				id: toolCall.id,
				name: toolCall.name,
				input: toolCall.input,
			};
		}

		// Build content blocks for the complete message
		const content: LlmContentBlock[] = [];
		if (accumulatedText) {
			content.push({ type: 'text', text: accumulatedText });
		}
		for (const toolCall of toolCalls) {
			content.push({
				type: 'tool_use',
				id: toolCall.id,
				name: toolCall.name,
				input: toolCall.input,
			});
		}

		const stopReason = toolCalls.length > 0 ? 'tool_use' : 'end_turn';

		yield {
			type: 'message-complete',
			stopReason,
			content,
		};
	}
}

function toOllamaMessages(system: string, messages: LlmMessage[]): Message[] {
	const result: Message[] = [{ role: 'system', content: system }];

	for (const msg of messages) {
		if (typeof msg.content === 'string') {
			result.push({ role: msg.role, content: msg.content });
			continue;
		}

		// Assistant messages with tool_use blocks need tool_calls
		if (msg.role === 'assistant') {
			const textParts = msg.content
				.filter((b) => b.type === 'text')
				.map((b) => (b as { text: string }).text)
				.join('');
			const toolUseBlocks = msg.content.filter(
				(b) => b.type === 'tool_use',
			);

			result.push({
				role: 'assistant',
				content: textParts,
				tool_calls: toolUseBlocks.map((b) => ({
					function: {
						name: (b as { name: string }).name,
						arguments: (b as { input: Record<string, unknown> })
							.input,
					},
				})),
			});
			continue;
		}

		// User messages may contain tool_result blocks
		const toolResults = msg.content.filter((b) => b.type === 'tool_result');
		if (toolResults.length > 0) {
			for (const tr of toolResults) {
				result.push({
					role: 'tool',
					content: (tr as { content: string }).content,
				});
			}
			continue;
		}

		// Plain user message with content blocks
		const text = msg.content
			.filter((b) => b.type === 'text')
			.map((b) => (b as { text: string }).text)
			.join('');
		if (text) {
			result.push({ role: msg.role, content: text });
		}
	}

	return result;
}

function toOllamaTool(tool: LlmToolDefinition): Tool {
	return {
		type: 'function',
		function: {
			name: tool.name,
			description: tool.description,
			parameters: tool.inputSchema as Tool['function']['parameters'],
		},
	};
}
