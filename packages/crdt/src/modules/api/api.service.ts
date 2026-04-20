import type { Extension, onRequestPayload } from '@hocuspocus/server';
import { Injectable } from '@nestjs/common';
import * as crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import * as Y from 'yjs';

const NARRATIVE_FIELD = 'narrative';

type TextRun = {
	text: string;
	marks?: Record<string, unknown>;
};

type InsertItem = {
	nodeType: string;
	attrs?: Record<string, string>;
	content: TextRun[];
};

type DeltaOp =
	| { retain: number }
	| { delete: number }
	| { insert: InsertItem[] };

type StructuredNode = {
	index: number;
	nodeType: string;
	attrs: Record<string, string>;
	content: TextRun[];
};

function contextForDocument(documentName: string): { user: { sub: string } } {
	if (documentName.startsWith('profile:')) {
		return { user: { sub: documentName.slice('profile:'.length) } };
	}
	throw new Error(`Unsupported document name: ${documentName}`);
}

function readBody(req: IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		let data = '';
		req.on('data', (chunk: Buffer) => (data += chunk.toString()));
		req.on('end', () => resolve(data));
		req.on('error', reject);
	});
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
	if (res.headersSent) return;
	res.writeHead(status, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify(body));
}

function elementToStructured(
	element: Y.XmlElement,
	index: number,
): StructuredNode {
	const content: TextRun[] = [];
	for (const child of element.toArray()) {
		if (child instanceof Y.XmlText) {
			const delta = child.toDelta() as Array<{
				insert: string;
				attributes?: Record<string, unknown>;
			}>;
			for (const run of delta) {
				const marks = run.attributes;
				content.push(
					marks && Object.keys(marks).length > 0
						? { text: run.insert, marks }
						: { text: run.insert },
				);
			}
		}
	}
	return {
		index,
		nodeType: element.nodeName,
		attrs: (element.getAttributes() ?? {}) as Record<string, string>,
		content,
	};
}

function buildElement(item: InsertItem): Y.XmlElement {
	const element = new Y.XmlElement(item.nodeType);
	if (item.attrs) {
		for (const [key, val] of Object.entries(item.attrs)) {
			element.setAttribute(key, val);
		}
	}
	const textNode = new Y.XmlText();
	textNode.applyDelta(
		item.content.map((run) => ({
			insert: run.text,
			...(run.marks ? { attributes: run.marks } : {}),
		})),
	);
	element.insert(0, [textNode]);
	return element;
}

function applyDelta(fragment: Y.XmlFragment, delta: DeltaOp[]) {
	let cursor = 0;
	for (const op of delta) {
		if ('retain' in op) {
			cursor += op.retain;
		} else if ('delete' in op) {
			fragment.delete(cursor, op.delete);
		} else {
			const elements = op.insert.map(buildElement);
			fragment.insert(cursor, elements);
			cursor += elements.length;
		}
	}
}

@Injectable()
export class ApiService implements Extension {
	private readonly internalKey = process.env.CRDT_INTERNAL_KEY ?? '';

	private verifyRequest(request: IncomingMessage): boolean {
		const nonce = request.headers['x-nonce'] as string | undefined;
		const ts = request.headers['x-timestamp'] as string | undefined;
		const sig = request.headers['x-signature'] as string | undefined;
		if (!nonce || !ts || !sig || !this.internalKey) return false;

		if (Math.abs(Date.now() - Number(ts)) > 30_000) return false;

		const expected = crypto
			.createHmac('sha256', this.internalKey)
			.update(`${nonce}:${ts}`)
			.digest('hex');

		return crypto.timingSafeEqual(
			Buffer.from(sig, 'hex'),
			Buffer.from(expected, 'hex'),
		);
	}

	async onRequest({ request, response, instance }: onRequestPayload) {
		const url = new URL(request.url ?? '/', 'http://localhost');

		if (!url.pathname.startsWith('/api/')) return;

		if (!this.verifyRequest(request)) {
			sendJson(response, 401, { error: 'Unauthorized' });
			return;
		}

		try {
			const getMatch = url.pathname.match(/^\/api\/documents\/([^/]+)$/);
			if (getMatch && request.method === 'GET') {
				const name = decodeURIComponent(getMatch[1]);
				const conn = await instance.openDirectConnection(
					name,
					contextForDocument(name),
				);
				try {
					let nodes: StructuredNode[] = [];
					await conn.transact((doc) => {
						const fragment = doc.getXmlFragment(NARRATIVE_FIELD);
						nodes = Array.from(
							{ length: fragment.length },
							(_, i) =>
								elementToStructured(
									fragment.get(i) as Y.XmlElement,
									i,
								),
						);
					});
					sendJson(response, 200, { nodes });
				} finally {
					await conn.disconnect();
				}
				return;
			}

			const deltaMatch = url.pathname.match(
				/^\/api\/documents\/([^/]+)\/apply-delta$/,
			);
			if (deltaMatch && request.method === 'POST') {
				const name = decodeURIComponent(deltaMatch[1]);
				const body = JSON.parse(await readBody(request)) as {
					delta: DeltaOp[];
				};

				const conn = await instance.openDirectConnection(
					name,
					contextForDocument(name),
				);
				let length = 0;
				try {
					await conn.transact((doc) => {
						const fragment = doc.getXmlFragment(NARRATIVE_FIELD);
						applyDelta(fragment, body.delta);
						length = fragment.length;
					});
				} finally {
					await conn.disconnect();
				}
				sendJson(response, 200, { ok: true, length });
				return;
			}

			sendJson(response, 404, { error: 'Not found' });
		} catch (err) {
			const message =
				err instanceof Error ? err.message : 'Internal server error';
			sendJson(response, 500, { error: message });
		}
	}
}
