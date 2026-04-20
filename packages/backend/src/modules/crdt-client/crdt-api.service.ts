import { Injectable, Logger } from '@nestjs/common';

import configuration from '../../configuration';
import { RequestSigningService } from '../request-signing';

export type TextRun = {
	text: string;
	marks?: Record<string, unknown>;
};

export type InsertItem = {
	nodeType: 'paragraph' | 'heading';
	attrs?: Record<string, string>;
	content: TextRun[];
};

export type DeltaOp =
	| { retain: number }
	| { delete: number }
	| { insert: InsertItem[] };

export type NarrativeNode = {
	index: number;
	nodeType: string;
	attrs: Record<string, string>;
	content: TextRun[];
};

@Injectable()
export class CrdtApiService {
	private readonly logger = new Logger(CrdtApiService.name);
	private readonly baseUrl = configuration.crdt.httpUrl;

	constructor(private readonly signing: RequestSigningService) {}

	async readDocument(
		documentName: string,
	): Promise<{ nodes: NarrativeNode[] }> {
		const url = `${this.baseUrl}/api/documents/${encodeURIComponent(documentName)}`;
		const res = await fetch(url, {
			headers: this.signing.getSigningHeaders(),
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
				...this.signing.getSigningHeaders(),
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
