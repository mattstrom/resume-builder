import { Injectable } from '@nestjs/common';
import type { Response } from 'express';

import { LlmProviderRegistry } from '../llm/llm-provider-registry.service';
import type {
	LlmContentBlock,
	LlmMessage,
	LlmStreamEvent,
	LlmToolDefinition,
} from '../llm/interfaces/llm-types';
import {
	finishStream,
	initSseHeaders,
	writeChunk,
} from './vercel-stream-writer';

const MAX_TOOL_ITERATIONS = 10;

export interface StreamWithToolLoopOptions {
	provider: string;
	model: string;
	system: string;
	messages: LlmMessage[];
	tools: LlmToolDefinition[];
	executeTool: (
		name: string,
		input: Record<string, unknown>,
	) => Promise<string>;
	conversationId?: string;
}

@Injectable()
export class ChatService {
	constructor(private readonly llmRegistry: LlmProviderRegistry) {}

	async streamWithToolLoop(
		res: Response,
		options: StreamWithToolLoopOptions,
	): Promise<string> {
		const {
			provider: providerName,
			model,
			system,
			tools,
			executeTool,
			conversationId,
		} = options;
		const provider = this.llmRegistry.getProvider(providerName);

		initSseHeaders(res, conversationId);
		writeChunk(res, { type: 'start' });

		let accumulatedText = '';
		let currentMessages = [...options.messages];

		for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
			writeChunk(res, { type: 'start-step' });

			let messageComplete: Extract<
				LlmStreamEvent,
				{ type: 'message-complete' }
			> | null = null;

			for await (const event of provider.stream({
				model,
				system,
				messages: currentMessages,
				tools,
			})) {
				switch (event.type) {
					case 'text-start':
						writeChunk(res, {
							type: 'text-start',
							id: event.id,
						});
						break;
					case 'text-delta':
						accumulatedText += event.delta;
						writeChunk(res, {
							type: 'text-delta',
							id: event.id,
							delta: event.delta,
						});
						break;
					case 'text-end':
						writeChunk(res, {
							type: 'text-end',
							id: event.id,
						});
						break;
					case 'tool-use':
						writeChunk(res, {
							type: 'tool-input-available',
							toolCallId: event.id,
							toolName: event.name,
							input: event.input,
						});
						break;
					case 'message-complete':
						messageComplete = event;
						break;
				}
			}

			if (!messageComplete) {
				break;
			}

			// Handle tool use
			const toolUseBlocks = messageComplete.content.filter(
				(
					block,
				): block is Extract<LlmContentBlock, { type: 'tool_use' }> =>
					block.type === 'tool_use',
			);

			if (
				messageComplete.stopReason === 'tool_use' &&
				toolUseBlocks.length > 0
			) {
				const toolResults: LlmContentBlock[] = [];

				for (const toolBlock of toolUseBlocks) {
					try {
						const output = await executeTool(
							toolBlock.name,
							toolBlock.input,
						);

						writeChunk(res, {
							type: 'tool-output-available',
							toolCallId: toolBlock.id,
							output,
						});

						toolResults.push({
							type: 'tool_result',
							toolUseId: toolBlock.id,
							content: output,
						});
					} catch (error) {
						const errorMsg =
							error instanceof Error
								? error.message
								: String(error);

						writeChunk(res, {
							type: 'tool-output-error',
							toolCallId: toolBlock.id,
							error: errorMsg,
						});

						toolResults.push({
							type: 'tool_result',
							toolUseId: toolBlock.id,
							content: errorMsg,
							isError: true,
						});
					}
				}

				writeChunk(res, { type: 'finish-step' });

				// Append assistant message and tool results for next iteration
				currentMessages = [
					...currentMessages,
					{
						role: 'assistant',
						content: messageComplete.content,
					},
					{ role: 'user', content: toolResults },
				];

				continue;
			}

			// No tool use — finish
			writeChunk(res, { type: 'finish-step' });
			break;
		}

		finishStream(res);

		return accumulatedText;
	}
}
