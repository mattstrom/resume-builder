import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import type { Response } from 'express';
import { randomUUID } from 'crypto';

const client = new Anthropic();

/**
 * Writes a Vercel AI SDK UI message stream chunk as an SSE event.
 */
function writeChunk(res: Response, chunk: Record<string, unknown>): void {
	res.write(`data: ${JSON.stringify(chunk)}\n\n`);
}

/**
 * Streams an Anthropic Messages API response to an Express response
 * using the Vercel AI SDK UI message stream protocol, so that
 * `useChat` + `DefaultChatTransport` on the frontend can consume it.
 */
export async function streamAnthropicResponse(
	res: Response,
	options: {
		model: string;
		system: string;
		messages: MessageParam[];
	},
): Promise<void> {
	const textPartId = randomUUID();

	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');
	res.setHeader('X-Vercel-AI-UI-Message-Stream', 'v1');
	res.flushHeaders();

	writeChunk(res, { type: 'start' });
	writeChunk(res, { type: 'start-step' });
	writeChunk(res, { type: 'text-start', id: textPartId });

	const stream = client.messages.stream({
		model: options.model,
		max_tokens: 4096,
		system: options.system,
		messages: options.messages,
	});

	for await (const event of stream) {
		if (
			event.type === 'content_block_delta' &&
			event.delta.type === 'text_delta'
		) {
			writeChunk(res, {
				type: 'text-delta',
				id: textPartId,
				delta: event.delta.text,
			});
		}
	}

	writeChunk(res, { type: 'text-end', id: textPartId });
	writeChunk(res, { type: 'finish-step' });
	writeChunk(res, { type: 'finish', finishReason: 'stop' });
	res.write('data: [DONE]\n\n');
	res.end();
}
