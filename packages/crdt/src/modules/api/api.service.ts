import type { Extension, onRequestPayload } from '@hocuspocus/server';
import { Injectable } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import * as Y from 'yjs';

const NARRATIVE_FIELD = 'narrative';

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

@Injectable()
export class ApiService implements Extension {
	private readonly internalKey = process.env.CRDT_INTERNAL_KEY ?? '';

	async onRequest({ request, response, instance }: onRequestPayload) {
		const url = new URL(request.url ?? '/', 'http://localhost');

		if (!url.pathname.startsWith('/api/')) return;

		if (
			!this.internalKey ||
			request.headers['x-internal-key'] !== this.internalKey
		) {
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
					let xml = '';
					await conn.transact((doc) => {
						xml = doc.getXmlFragment(NARRATIVE_FIELD).toString();
					});
					sendJson(response, 200, { xml });
				} finally {
					await conn.disconnect();
				}
				return;
			}

			const insertMatch = url.pathname.match(
				/^\/api\/documents\/([^/]+)\/insert$/,
			);
			if (insertMatch && request.method === 'POST') {
				const name = decodeURIComponent(insertMatch[1]);
				const body = JSON.parse(await readBody(request)) as {
					index: number;
					nodeType: string;
					text: string;
					attrs?: Record<string, string>;
				};

				const conn = await instance.openDirectConnection(
					name,
					contextForDocument(name),
				);
				let length = 0;
				try {
					await conn.transact((doc) => {
						const fragment = doc.getXmlFragment(NARRATIVE_FIELD);
						const element = new Y.XmlElement(body.nodeType);
						if (body.attrs) {
							for (const [key, val] of Object.entries(
								body.attrs,
							)) {
								element.setAttribute(key, val);
							}
						}
						const textNode = new Y.XmlText();
						textNode.insert(0, body.text);
						element.insert(0, [textNode]);
						const pos =
							body.index === -1 ? fragment.length : body.index;
						fragment.insert(pos, [element]);
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
