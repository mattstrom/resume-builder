import { Injectable } from '@nestjs/common';
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
export class LmStudioProviderService implements LlmProvider {
	readonly name = 'lm-studio';
	private readonly host: string;

	constructor() {
		this.host = configuration.llms.lmStudio.host;
	}

	async *stream(options: LlmRequestOptions): AsyncIterable<LlmStreamEvent> {
		const messages = toOpenAiMessages(options.system, options.messages);
		const tools = options.tools?.map(toOpenAiTool);

		const response = await fetch(`${this.host}/v1/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: options.model,
				messages,
				stream: true,
				...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
				...(tools && tools.length > 0 ? { tools } : {}),
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`LM Studio API error: ${response.status} ${error}`);
		}

		if (!response.body) {
			throw new Error('No response body from LM Studio');
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let textPartId: string | null = null;
		let accumulatedText = '';
		const toolCalls: Array<{
			id: string;
			name: string;
			input: string;
		}> = [];

		let buffer = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() || '';

			for (const line of lines) {
				const trimmedLine = line.trim();
				if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
				if (trimmedLine === 'data: [DONE]') break;

				try {
					const data = JSON.parse(trimmedLine.slice(6));
					const choice = data.choices[0];
					if (!choice) continue;

					const delta = choice.delta;

					// Handle tool calls
					if (delta.tool_calls) {
						for (const tc of delta.tool_calls) {
							if (tc.index === undefined) continue;
							if (!toolCalls[tc.index]) {
								toolCalls[tc.index] = {
									id: tc.id || randomUUID(),
									name: '',
									input: '',
								};
							}
							if (tc.function?.name) {
								toolCalls[tc.index].name += tc.function.name;
							}
							if (tc.function?.arguments) {
								toolCalls[tc.index].input +=
									tc.function.arguments;
							}
						}
						continue;
					}

					const text = delta.content;
					if (!text) continue;

					if (!textPartId) {
						textPartId = randomUUID();
						yield { type: 'text-start', id: textPartId };
					}
					accumulatedText += text;
					yield { type: 'text-delta', id: textPartId, delta: text };
				} catch (e) {
					// Ignore parse errors for incomplete chunks
					continue;
				}
			}
		}

		// Close text block if open
		if (textPartId) {
			yield { type: 'text-end', id: textPartId };
		}

		// Emit tool-use events
		const finalToolCalls = toolCalls
			.filter((tc) => tc)
			.map((tc) => ({
				id: tc.id,
				name: tc.name,
				input: JSON.parse(tc.input || '{}'),
			}));

		for (const toolCall of finalToolCalls) {
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
		for (const toolCall of finalToolCalls) {
			content.push({
				type: 'tool_use',
				id: toolCall.id,
				name: toolCall.name,
				input: toolCall.input,
			});
		}

		const stopReason = finalToolCalls.length > 0 ? 'tool_use' : 'end_turn';

		yield {
			type: 'message-complete',
			stopReason,
			content,
		};
	}
}

function toOpenAiMessages(system: string, messages: LlmMessage[]): any[] {
	const result: any[] = [{ role: 'system', content: system }];

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

			const openaiMsg: any = {
				role: 'assistant',
				content: textParts || null,
			};

			if (toolUseBlocks.length > 0) {
				openaiMsg.tool_calls = toolUseBlocks.map((b) => ({
					id: (b as { id: string }).id,
					type: 'function',
					function: {
						name: (b as { name: string }).name,
						arguments: JSON.stringify(
							(b as { input: Record<string, unknown> }).input,
						),
					},
				}));
			}

			result.push(openaiMsg);
			continue;
		}

		// User messages may contain tool_result blocks
		const toolResults = msg.content.filter((b) => b.type === 'tool_result');
		if (toolResults.length > 0) {
			for (const tr of toolResults) {
				result.push({
					role: 'tool',
					tool_call_id: (tr as { toolUseId: string }).toolUseId,
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

function toOpenAiTool(tool: LlmToolDefinition): any {
	return {
		type: 'function',
		function: {
			name: tool.name,
			description: tool.description,
			parameters: tool.inputSchema,
		},
	};
}
