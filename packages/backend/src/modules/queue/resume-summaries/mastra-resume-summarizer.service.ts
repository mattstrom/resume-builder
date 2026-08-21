import { Injectable } from '@nestjs/common';
import { resumeSummarySchema, type ResumeSummaryValue } from '@resume-builder/entities';

import configuration from '../../../configuration.js';
import type { ResumeSummaryDocument } from './resume-summary.types.js';

@Injectable()
export class MastraResumeSummarizerService {
	async summarize(document: ResumeSummaryDocument): Promise<ResumeSummaryValue> {
		const internalKey = configuration.mastra.internalKey;
		const response = await fetch(
			`${configuration.mastra.url.replace(/\/$/, '')}/internal/resume-summary`,
			{
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					...(internalKey ? { 'x-internal-key': internalKey } : {}),
				},
				body: JSON.stringify({
					name: document.name,
					company: document.company,
					level: document.level,
					content: document.content,
				}),
			},
		);

		if (!response.ok) {
			const detail = await response.text();
			throw new Error(
				`Mastra resume summarization failed (${response.status}): ${detail.slice(0, 500)}`,
			);
		}

		return resumeSummarySchema.parse(await response.json());
	}
}
