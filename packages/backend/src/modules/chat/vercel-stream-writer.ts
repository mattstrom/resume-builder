import type { Response } from 'express';

/**
 * Writes a Vercel AI SDK UI message stream chunk as an SSE event.
 */
export function writeChunk(
	res: Response,
	chunk: Record<string, unknown>,
): void {
	res.write(`data: ${JSON.stringify(chunk)}\n\n`);
}

/**
 * Sets SSE headers for a Vercel AI SDK UI message stream.
 */
export function initSseHeaders(res: Response, conversationId?: string): void {
	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');
	res.setHeader('X-Vercel-AI-UI-Message-Stream', 'v1');
	if (conversationId) {
		res.setHeader('X-Conversation-Id', conversationId);
		res.setHeader('Access-Control-Expose-Headers', 'X-Conversation-Id');
	}
	res.flushHeaders();
}

/**
 * Ends the SSE stream with the Vercel AI SDK finish protocol.
 */
export function finishStream(res: Response): void {
	writeChunk(res, { type: 'finish', finishReason: 'stop' });
	res.write('data: [DONE]\n\n');
	res.end();
}
