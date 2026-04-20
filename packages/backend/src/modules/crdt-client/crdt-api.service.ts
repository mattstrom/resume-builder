import { Injectable, Logger } from '@nestjs/common';

import configuration from '../../configuration';

export type InsertItem = {
	nodeType: 'paragraph' | 'heading';
	text: string;
	attrs?: Record<string, string>;
};

export type DeltaOp =
	| { retain: number }
	| { delete: number }
	| { insert: InsertItem[] };

export type NarrativeNode = { index: number; xml: string };

@Injectable()
export class CrdtApiService {
	private readonly logger = new Logger(CrdtApiService.name);
	private readonly baseUrl = configuration.crdt.httpUrl;
	private readonly internalKey = configuration.crdt.internalKey;

	async readDocument(
		documentName: string,
	): Promise<{ nodes: NarrativeNode[] }> {
		const url = `${this.baseUrl}/api/documents/${encodeURIComponent(documentName)}`;
		const res = await fetch(url, {
			headers: { 'x-internal-key': this.internalKey },
		});
		if (!res.ok) {
			const body = await res.text();
			this.logger.error(`CRDT API read failed: ${res.status} ${body}`);
			throw new Error(`CRDT API error: ${res.status}`);
		}
		return res.json() as Promise<{ nodes: NarrativeNode[] }>;
	}

	async applyDelta(
		documentName: string,
		delta: DeltaOp[],
	): Promise<{ ok: boolean; length: number }> {
		const url = `${this.baseUrl}/api/documents/${encodeURIComponent(documentName)}/apply-delta`;
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-internal-key': this.internalKey,
			},
			body: JSON.stringify({ delta }),
		});
		if (!res.ok) {
			const body = await res.text();
			this.logger.error(
				`CRDT API apply-delta failed: ${res.status} ${body}`,
			);
			throw new Error(`CRDT API error: ${res.status}`);
		}
		return res.json() as Promise<{ ok: boolean; length: number }>;
	}
}
