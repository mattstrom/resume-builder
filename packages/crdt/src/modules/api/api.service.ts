import * as crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { Extension, onRequestPayload } from '@hocuspocus/server';
import { Injectable } from '@nestjs/common';
import type { ResumeXmlOp } from '@resume-builder/entities';
import * as Y from 'yjs';

import {
	applyResumeXmlOps,
	getResumeContent,
	replaceResumeXml,
	serializeResumeXml,
} from '../storage/resume-xml-document.js';

const NARRATIVE_FIELD = 'narrative';
const PROFESSIONAL_STATEMENTS_FIELD = 'professionalStatements';

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

type JsonPatchOp =
	| { op: 'set'; path: string; value: unknown }
	| { op: 'delete'; path: string }
	| { op: 'insert'; path: string; index: number; value: unknown }
	| { op: 'remove'; path: string; index: number };

type StructuredNode = {
	index: number;
	nodeType: string;
	attrs: Record<string, string>;
	content: TextRun[];
	children?: StructuredNode[];
};

function contextForDocument(
	documentName: string,
	uid?: string,
): { user: { sub: string } } {
	if (documentName.startsWith('profile:')) {
		return { user: { sub: documentName.slice('profile:'.length) } };
	}
	if (documentName.startsWith('resume:') && uid) {
		return { user: { sub: uid } };
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
	if (res.headersSent) {
		return;
	}

	res.writeHead(status, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify(body));
}

function elementToStructured(
	element: Y.XmlElement,
	index: number,
): StructuredNode {
	const content: TextRun[] = [];
	const children: StructuredNode[] = [];
	for (const [childIndex, child] of element.toArray().entries()) {
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
		} else if (child instanceof Y.XmlElement) {
			children.push(elementToStructured(child, childIndex));
		}
	}

	return {
		index,
		nodeType: element.nodeName,
		attrs: (element.getAttributes() ?? {}) as Record<string, string>,
		content,
		...(children.length ? { children } : {}),
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

function toYValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		const array = new Y.Array<unknown>();
		array.insert(0, value.map(toYValue));
		return array;
	}
	if (value !== null && typeof value === 'object') {
		const map = new Y.Map<unknown>();
		for (const [key, entry] of Object.entries(value)) {
			map.set(key, toYValue(entry));
		}
		return map;
	}
	return value ?? null;
}

function fromYValue(value: unknown): unknown {
	if (value instanceof Y.Map) {
		const object: Record<string, unknown> = {};
		for (const [key, entry] of value.entries()) {
			object[key] = fromYValue(entry);
		}
		return object;
	}
	if (value instanceof Y.Array) {
		return value.toArray().map(fromYValue);
	}
	return value;
}

function getChild(
	container: Y.Map<unknown> | Y.Array<unknown>,
	segment: string,
): unknown {
	if (container instanceof Y.Array) {
		const index = Number(segment);
		if (!Number.isInteger(index)) {
			throw new Error(
				`Expected numeric index for array segment, got "${segment}"`,
			);
		}
		return container.get(index);
	}
	return container.get(segment);
}

function getParent(
	root: Y.Map<unknown>,
	path: string,
	createMissing: boolean,
): {
	parent: Y.Map<unknown> | Y.Array<unknown>;
	lastSegment: string;
} {
	const segments = path.split(/[./]/).filter(Boolean);
	if (segments.length === 0) {
		throw new Error('Patch path must not be empty');
	}

	let current: Y.Map<unknown> | Y.Array<unknown> = root;
	for (const [index, segment] of segments.slice(0, -1).entries()) {
		let child = getChild(current, segment);
		if (child === undefined || child === null) {
			if (!createMissing) {
				throw new Error(
					`Path segment "${segment}" not found at index ${index}`,
				);
			}
			if (current instanceof Y.Array) {
				throw new Error(
					`Cannot auto-create children inside a Y.Array at "${segment}"`,
				);
			}
			const next = new Y.Map<unknown>();
			current.set(segment, next);
			child = next;
		}
		if (!(child instanceof Y.Map) && !(child instanceof Y.Array)) {
			throw new Error(
				`Path segment "${segment}" is a leaf value, not a container`,
			);
		}
		current = child;
	}

	return { parent: current, lastSegment: segments.at(-1)! };
}

function applyJsonPatch(root: Y.Map<unknown>, ops: JsonPatchOp[]) {
	for (const op of ops) {
		const { parent, lastSegment } = getParent(
			root,
			op.path,
			op.op === 'set',
		);
		if (op.op === 'set') {
			if (parent instanceof Y.Array) {
				const index = Number(lastSegment);
				if (!Number.isInteger(index)) {
					throw new Error(
						`Expected numeric index for array set, got "${lastSegment}"`,
					);
				}
				if (index < parent.length) {
					parent.delete(index, 1);
				}
				parent.insert(index, [toYValue(op.value)]);
			} else {
				parent.set(lastSegment, toYValue(op.value));
			}
			continue;
		}
		if (op.op === 'delete') {
			if (parent instanceof Y.Array) {
				const index = Number(lastSegment);
				if (!Number.isInteger(index)) {
					throw new Error(
						`Expected numeric index for array delete, got "${lastSegment}"`,
					);
				}
				parent.delete(index, 1);
			} else {
				parent.delete(lastSegment);
			}
			continue;
		}
		const target = getChild(parent, lastSegment);
		if (!(target instanceof Y.Array)) {
			throw new Error(`${op.op} target at "${op.path}" is not a Y.Array`);
		}
		if (op.op === 'insert') {
			target.insert(op.index, [toYValue(op.value)]);
		} else {
			target.delete(op.index, 1);
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

		if (!nonce || !ts || !sig || !this.internalKey) {
			return false;
		}

		if (Math.abs(Date.now() - Number(ts)) > 30_000) {
			return false;
		}

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

		if (!url.pathname.startsWith('/api/')) {
			return;
		}

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
					let professionalStatements: unknown[] = [];
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
						professionalStatements = fromYValue(
							doc.getArray(PROFESSIONAL_STATEMENTS_FIELD),
						) as unknown[];
					});
					sendJson(response, 200, { nodes, professionalStatements });
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

			const patchMatch = url.pathname.match(
				/^\/api\/documents\/([^/]+)\/apply-patch$/,
			);

			if (patchMatch && request.method === 'POST') {
				const name = decodeURIComponent(patchMatch[1]);
				const body = JSON.parse(await readBody(request)) as {
					ops: ResumeXmlOp[];
					uid: string;
				};
				if (
					!name.startsWith('resume:') ||
					!Array.isArray(body.ops) ||
					!body.uid
				) {
					throw new Error('Invalid resume patch request');
				}

				const conn = await instance.openDirectConnection(
					name,
					contextForDocument(name, body.uid),
				);
				let resume: unknown;
				let xml = '';
				try {
					await conn.transact((doc) => {
						applyResumeXmlOps(doc, body.ops);
						xml = serializeResumeXml(doc);
						resume = getResumeContent(doc, body.uid);
					});
				} finally {
					await conn.disconnect();
				}
				sendJson(response, 200, { ok: true, xml, resume });

				return;
			}

			const replaceMatch = url.pathname.match(
				/^\/api\/documents\/([^/]+)\/replace-xml$/,
			);

			if (replaceMatch && request.method === 'POST') {
				const name = decodeURIComponent(replaceMatch[1]);
				const body = JSON.parse(await readBody(request)) as {
					xml: string;
					uid: string;
					baseStateVector?: string;
				};
				if (!name.startsWith('resume:') || !body.xml || !body.uid) {
					throw new Error('Invalid resume XML replacement request');
				}
				const conn = await instance.openDirectConnection(
					name,
					contextForDocument(name, body.uid),
				);
				let resume: unknown;
				let stateVector = '';
				try {
					await conn.transact((doc) => {
						const current = Buffer.from(
							Y.encodeStateVector(doc),
						).toString('base64');
						if (
							body.baseStateVector &&
							body.baseStateVector !== current
						) {
							throw new Error(
								'Resume XML changed since the editor buffer was opened',
							);
						}
						replaceResumeXml(doc, body.xml);
						resume = getResumeContent(doc, body.uid);
						stateVector = Buffer.from(
							Y.encodeStateVector(doc),
						).toString('base64');
					});
				} finally {
					await conn.disconnect();
				}
				sendJson(response, 200, {
					ok: true,
					xml: body.xml,
					resume,
					stateVector,
				});
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
