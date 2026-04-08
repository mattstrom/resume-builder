import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type {
	ContentBlock,
	MessageParam,
} from '@anthropic-ai/sdk/resources/messages';
import { randomUUID } from 'crypto';

import type { LlmProvider } from '../interfaces/llm-provider.interface';
import type {
	LlmContentBlock,
	LlmMessage,
	LlmRequestOptions,
	LlmStreamEvent,
	LlmToolDefinition,
} from '../interfaces/llm-types';

@Injectable()
export class AnthropicProviderService implements LlmProvider {
	readonly name = 'anthropic';
	private readonly client: Anthropic;

	constructor() {
		this.client = new Anthropic();
	}

	async *stream(options: LlmRequestOptions): AsyncIterable<LlmStreamEvent> {
		const messages = toAnthropicMessages(options.messages);
		const tools = options.tools?.map(toAnthropicTool);

		const stream = this.client.messages.stream({
			model: options.model,
			max_tokens: options.maxTokens ?? 4096,
			system: options.system,
			messages,
			...(tools && tools.length > 0 ? { tools } : {}),
		});

		let textPartId: string | null = null;

		for await (const event of stream) {
			if (event.type === 'content_block_start') {
				if (event.content_block.type === 'text') {
					textPartId = randomUUID();
					yield { type: 'text-start', id: textPartId };
				}
			} else if (event.type === 'content_block_delta') {
				if (event.delta.type === 'text_delta' && textPartId) {
					yield {
						type: 'text-delta',
						id: textPartId,
						delta: event.delta.text,
					};
				}
			} else if (event.type === 'content_block_stop') {
				if (textPartId) {
					yield { type: 'text-end', id: textPartId };
					textPartId = null;
				}
			}
		}

		const finalMessage = await stream.finalMessage();

		// Emit tool-use events for any tool use blocks
		for (const block of finalMessage.content) {
			if (block.type === 'tool_use') {
				yield {
					type: 'tool-use',
					id: block.id,
					name: block.name,
					input: block.input as Record<string, unknown>,
				};
			}
		}

		yield {
			type: 'message-complete',
			stopReason: finalMessage.stop_reason as
				| 'end_turn'
				| 'tool_use'
				| 'max_tokens',
			content: fromAnthropicContent(finalMessage.content),
		};
	}
}

function toAnthropicMessages(messages: LlmMessage[]): MessageParam[] {
	return messages
		.filter((m) => m.role !== 'system')
		.map((msg) => {
			if (typeof msg.content === 'string') {
				return {
					role: msg.role as 'user' | 'assistant',
					content: msg.content,
				};
			}

			const content: MessageParam['content'] = msg.content.map(
				(block) => {
					switch (block.type) {
						case 'text':
							return { type: 'text' as const, text: block.text };
						case 'tool_use':
							return {
								type: 'tool_use' as const,
								id: block.id,
								name: block.name,
								input: block.input,
							};
						case 'tool_result':
							return {
								type: 'tool_result' as const,
								tool_use_id: block.toolUseId,
								content: block.content,
								...(block.isError ? { is_error: true } : {}),
							};
					}
				},
			);

			return {
				role: msg.role as 'user' | 'assistant',
				content,
			};
		});
}

function toAnthropicTool(tool: LlmToolDefinition): Anthropic.Tool {
	return {
		name: tool.name,
		description: tool.description,
		input_schema: tool.inputSchema as Anthropic.Tool['input_schema'],
	};
}

function fromAnthropicContent(content: ContentBlock[]): LlmContentBlock[] {
	return content.map((block) => {
		if (block.type === 'text') {
			return { type: 'text', text: block.text };
		}
		if (block.type === 'tool_use') {
			return {
				type: 'tool_use',
				id: block.id,
				name: block.name,
				input: block.input as Record<string, unknown>,
			};
		}
		throw new Error(
			`Unexpected Anthropic content block type: ${block.type}`,
		);
	});
}
