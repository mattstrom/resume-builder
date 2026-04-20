import { Injectable, Logger } from '@nestjs/common';

import configuration from '../../configuration';

export interface InsertNodePayload {
	index: number;
	nodeType: 'paragraph' | 'heading';
	text: string;
	attrs?: Record<string, string>;
}

@Injectable()
export class CrdtApiService {
	private readonly logger = new Logger(CrdtApiService.name);
	private readonly baseUrl = configuration.crdt.httpUrl;
	private readonly internalKey = configuration.crdt.internalKey;

	async readDocument(documentName: string): Promise<{ xml: string }> {
		const url = `${this.baseUrl}/api/documents/${encodeURIComponent(documentName)}`;
		const res = await fetch(url, {
			headers: { 'x-internal-key': this.internalKey },
		});
		if (!res.ok) {
			const body = await res.text();
			this.logger.error(`CRDT API read failed: ${res.status} ${body}`);
			throw new Error(`CRDT API error: ${res.status}`);
		}
		return res.json() as Promise<{ xml: string }>;
	}

	async insertNode(
		documentName: string,
		payload: InsertNodePayload,
	): Promise<{ ok: boolean; length: number }> {
		const url = `${this.baseUrl}/api/documents/${encodeURIComponent(documentName)}/insert`;
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-internal-key': this.internalKey,
			},
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			const body = await res.text();
			this.logger.error(`CRDT API insert failed: ${res.status} ${body}`);
			throw new Error(`CRDT API error: ${res.status}`);
		}
		return res.json() as Promise<{ ok: boolean; length: number }>;
	}
}
