import { Injectable, Logger } from '@nestjs/common';
import { DeltaOp, NarrativeNode, type ResumeXmlOp } from '@resume-builder/entities';

import configuration from '../../configuration.js';
import { RequestSigningService } from '../request-signing/index.js';

export type ResumePatchOp = ResumeXmlOp;

@Injectable()
export class CrdtApiService {
	private readonly logger = new Logger(CrdtApiService.name);
	private readonly baseUrl = configuration.crdt.httpUrl;

	constructor(private readonly signing: RequestSigningService) {}

	async readDocument(documentName: string): Promise<{ nodes: NarrativeNode[] }> {
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
			this.logger.error(`CRDT API apply-delta failed: ${res.status} ${body}`);
			throw new Error(`CRDT API error: ${res.status}`);
		}

		return (await res.json()) as Promise<{ ok: boolean; length: number }>;
	}

	async applyResumePatch(
		documentName: string,
		uid: string,
		ops: ResumePatchOp[],
	): Promise<{ ok: boolean; xml: string; resume: unknown }> {
		const url = `${this.baseUrl}/api/documents/${encodeURIComponent(documentName)}/apply-patch`;
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...this.signing.getSigningHeaders(),
			},
			body: JSON.stringify({ uid, ops }),
		});

		if (!res.ok) {
			const body = await res.text();
			this.logger.error(`CRDT API resume patch failed: ${res.status} ${body}`);
			throw new Error(`CRDT API error: ${res.status}`);
		}

		return (await res.json()) as Promise<{
			ok: boolean;
			xml: string;
			resume: unknown;
		}>;
	}

	async replaceResumeXml(
		documentName: string,
		uid: string,
		xml: string,
		baseStateVector?: string,
	): Promise<{
		ok: boolean;
		xml: string;
		resume: unknown;
		stateVector: string;
	}> {
		const url = `${this.baseUrl}/api/documents/${encodeURIComponent(documentName)}/replace-xml`;
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...this.signing.getSigningHeaders(),
			},
			body: JSON.stringify({ uid, xml, baseStateVector }),
		});
		if (!res.ok) {
			const body = await res.text();
			this.logger.error(`CRDT API replace-xml failed: ${res.status} ${body}`);
			throw new Error(`CRDT API error: ${res.status}`);
		}
		return res.json() as Promise<{
			ok: boolean;
			xml: string;
			resume: unknown;
			stateVector: string;
		}>;
	}
}
