import Anthropic from '@anthropic-ai/sdk';
import type {
	ContentBlock,
	MessageParam,
} from '@anthropic-ai/sdk/resources/messages';
import type { Response } from 'express';
import { randomUUID } from 'crypto';

const client = new Anthropic();

const MAX_TOOL_ITERATIONS = 10;

/**
 * Writes a Vercel AI SDK UI message stream chunk as an SSE event.
 */
function writeChunk(res: Response, chunk: Record<string, unknown>): void {
	res.write(`data: ${JSON.stringify(chunk)}\n\n`);
}

export interface StreamOptions {
	model: string;
	system: string;
	messages: MessageParam[];
	tools?: Anthropic.Tool[];
	executeTool?: (
		name: string,
		input: Record<string, unknown>,
	) => Promise<string>;
}

/**
 * Streams an Anthropic Messages API response to an Express response
 * using the Vercel AI SDK UI message stream protocol, with support
 * for an agentic tool-use loop.
 */
export async function streamAnthropicResponse(
	res: Response,
	options: StreamOptions,
): Promise<void> {
	const { model, system, tools, executeTool } = options;
	let messages = [...options.messages];

	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');
	res.setHeader('X-Vercel-AI-UI-Message-Stream', 'v1');
	res.flushHeaders();

	writeChunk(res, { type: 'start' });

	for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
		writeChunk(res, { type: 'start-step' });

		const stream = client.messages.stream({
			model,
			max_tokens: 4096,
			system,
			messages,
			...(tools && tools.length > 0 ? { tools } : {}),
		});

		let textPartId: string | null = null;
		let textStarted = false;
		const contentBlocks: ContentBlock[] = [];

		for await (const event of stream) {
			if (event.type === 'content_block_start') {
				if (event.content_block.type === 'text') {
					textPartId = randomUUID();
					textStarted = true;
					writeChunk(res, {
						type: 'text-start',
						id: textPartId,
					});
				} else if (event.content_block.type === 'tool_use') {
					// Emit tool-input-available when we know the tool call
					// We'll emit it fully after the block is done
				}
			} else if (event.type === 'content_block_delta') {
				if (event.delta.type === 'text_delta' && textPartId) {
					writeChunk(res, {
						type: 'text-delta',
						id: textPartId,
						delta: event.delta.text,
					});
				}
			} else if (event.type === 'content_block_stop') {
				if (textStarted && textPartId) {
					writeChunk(res, {
						type: 'text-end',
						id: textPartId,
					});
					textStarted = false;
					textPartId = null;
				}
			} else if (event.type === 'message_delta') {
				// Captured via finalMessage
			}
		}

		const finalMessage = await stream.finalMessage();
		contentBlocks.push(...finalMessage.content);

		// Check for tool use
		const toolUseBlocks = finalMessage.content.filter(
			(block): block is Anthropic.ToolUseBlock =>
				block.type === 'tool_use',
		);

		if (
			finalMessage.stop_reason === 'tool_use' &&
			toolUseBlocks.length > 0 &&
			executeTool
		) {
			// Process each tool call
			const toolResults: MessageParam['content'] = [];

			for (const toolBlock of toolUseBlocks) {
				// Emit tool-input-available
				writeChunk(res, {
					type: 'tool-input-available',
					toolCallId: toolBlock.id,
					toolName: toolBlock.name,
					input: toolBlock.input,
				});

				try {
					const output = await executeTool(
						toolBlock.name,
						toolBlock.input as Record<string, unknown>,
					);

					// Emit tool-output-available
					writeChunk(res, {
						type: 'tool-output-available',
						toolCallId: toolBlock.id,
						output,
					});

					toolResults.push({
						type: 'tool_result',
						tool_use_id: toolBlock.id,
						content: output,
					});
				} catch (error) {
					const errorMsg =
						error instanceof Error ? error.message : String(error);

					writeChunk(res, {
						type: 'tool-output-error',
						toolCallId: toolBlock.id,
						error: errorMsg,
					});

					toolResults.push({
						type: 'tool_result',
						tool_use_id: toolBlock.id,
						content: errorMsg,
						is_error: true,
					});
				}
			}

			writeChunk(res, { type: 'finish-step' });

			// Append assistant message and tool results for next iteration
			messages = [
				...messages,
				{ role: 'assistant', content: finalMessage.content },
				{ role: 'user', content: toolResults },
			];

			continue;
		}

		// No tool use or end_turn — finish
		writeChunk(res, { type: 'finish-step' });
		break;
	}

	writeChunk(res, { type: 'finish', finishReason: 'stop' });
	res.write('data: [DONE]\n\n');
	res.end();
}
