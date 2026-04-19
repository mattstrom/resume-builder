import { Injectable, Logger } from '@nestjs/common';
import {
	HocuspocusProvider,
	HocuspocusProviderWebsocket,
} from '@hocuspocus/provider';
import WebSocket from 'ws';
import * as Y from 'yjs';

import configuration from '../../configuration';
import { applyJsonPatch, fromYValue, type JsonPatchOp } from './json-patch';

const CONNECT_TIMEOUT_MS = 10_000;

@Injectable()
export class CrdtClientService {
	private readonly logger = new Logger(CrdtClientService.name);

	/**
	 * Apply a patch to the live Yjs document for a resume. Connects as a
	 * transient client to the Hocuspocus server, waits for sync, applies the
	 * ops inside a single transaction, and returns a plain-JS snapshot of
	 * the resulting resume for the LLM to consume.
	 *
	 * The Hocuspocus `onStoreDocument` hook (debounced ~2s) handles Mongo
	 * persistence automatically — no Mongo writes required here.
	 */
	async patchResume(
		resumeId: string,
		ops: JsonPatchOp[],
		accessToken: string,
	): Promise<{ resume: unknown }> {
		const doc = new Y.Doc();
		let socket: HocuspocusProviderWebsocket | null = null;
		let provider: HocuspocusProvider | null = null;

		try {
			const connected = await this.connect(doc, resumeId, accessToken);
			socket = connected.socket;
			provider = connected.provider;

			const root = doc.getMap('resume') as Y.Map<unknown>;
			doc.transact(() => {
				applyJsonPatch(root, ops);
			});

			// Allow the outgoing update to flush over the websocket. Hocuspocus
			// sync is a single round-trip; one macrotask is enough for it to
			// leave the socket buffer before we disconnect.
			await new Promise((resolve) => setTimeout(resolve, 50));

			return { resume: fromYValue(root) };
		} finally {
			if (provider) {
				provider.destroy();
			}
			if (socket) {
				socket.disconnect();
				socket.destroy();
			}
			doc.destroy();
		}
	}

	private connect(
		doc: Y.Doc,
		resumeId: string,
		accessToken: string,
	): Promise<{
		provider: HocuspocusProvider;
		socket: HocuspocusProviderWebsocket;
	}> {
		return new Promise((resolve, reject) => {
			const documentName = `resume:${resumeId}`;
			let settled = false;

			const timeout = setTimeout(() => {
				if (settled) return;
				settled = true;
				reject(
					new Error(
						`Timed out connecting to CRDT server for ${documentName}`,
					),
				);
			}, CONNECT_TIMEOUT_MS);

			// Node lacks a global WebSocket; create a dedicated websocket
			// transport with the `ws` package as the polyfill, then hand it
			// to HocuspocusProvider via `websocketProvider`.
			const socket = new HocuspocusProviderWebsocket({
				url: configuration.crdt.url,
				WebSocketPolyfill: WebSocket,
			});

			const provider = new HocuspocusProvider({
				websocketProvider: socket,
				name: documentName,
				document: doc,
				token: accessToken,
				onSynced: () => {
					if (settled) return;
					settled = true;
					clearTimeout(timeout);
					resolve({ provider, socket });
				},
				onAuthenticationFailed: ({ reason }) => {
					if (settled) return;
					settled = true;
					clearTimeout(timeout);
					this.logger.warn(
						`CRDT auth failed for ${documentName}: ${reason}`,
					);
					reject(new Error(`CRDT authentication failed: ${reason}`));
				},
			});
		});
	}
}
