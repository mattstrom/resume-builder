import { Injectable } from '@nestjs/common';
import {
	resumeContentFromXml,
	type ResumeSummaryValue,
} from '@resume-builder/entities';

import { ResumeXmlRepository } from '../../entities/resumes/resume-xml.repository.js';
import { PrismaService } from '../../prisma/index.js';
import { RESUME_SUMMARY_RECONCILIATION_BATCH_SIZE } from './resume-summary.constants.js';
import type {
	ResumeSummaryDocument,
	ResumeSummaryDocumentProvider,
	ResumeSummaryTarget,
} from './resume-summary.types.js';

const SCHEMA = 'resume_builder';

@Injectable()
export class ResumeSummaryDocumentsService implements ResumeSummaryDocumentProvider {
	constructor(
		private readonly prisma: PrismaService,
		private readonly resumeXml: ResumeXmlRepository,
	) {}

	async findStaleTargets(
		requestedLimit = RESUME_SUMMARY_RECONCILIATION_BATCH_SIZE,
	): Promise<ResumeSummaryTarget[]> {
		const limit = Math.max(1, Math.min(requestedLimit, 1000));
		const rows = await this.prisma.$queryRawUnsafe<
			Array<{ resumeId: string; sourceUpdatedAt: Date }>
		>(
			`SELECT r.id AS "resumeId", rx."updatedAt" AS "sourceUpdatedAt"
			 FROM "${SCHEMA}"."Resume" r
			 JOIN "${SCHEMA}"."ResumeXml" rx ON rx."resumeId" = r.id
			 WHERE r.summary IS NULL
			    OR r."lastSummarizedAt" IS NULL
			    OR rx."updatedAt" > r."lastSummarizedAt"
			 ORDER BY rx."updatedAt" ASC
			 LIMIT $1`,
			limit,
		);

		return rows.map((row) => ({
			resumeId: row.resumeId,
			sourceUpdatedAt: row.sourceUpdatedAt.toISOString(),
		}));
	}

	async loadDocument(resumeId: string): Promise<ResumeSummaryDocument | null> {
		const resume = await this.prisma.resume.findUnique({
			where: { id: resumeId },
			include: { resumeXml: { select: { updatedAt: true } } },
		});
		if (!resume?.resumeXml) return null;

		const xml = await this.resumeXml.find(resume.uid, resume.id);
		if (!xml) return null;

		return {
			resumeId: resume.id,
			uid: resume.uid,
			name: resume.name,
			company: resume.company,
			level: resume.level ?? undefined,
			sourceUpdatedAt: resume.resumeXml.updatedAt.toISOString(),
			content: resumeContentFromXml(xml, resume.uid),
		};
	}

	async saveIfCurrent(
		resumeId: string,
		sourceUpdatedAt: string,
		summary: ResumeSummaryValue,
	): Promise<number | null> {
		const rows = await this.prisma.$queryRawUnsafe<
			Array<{ embeddingRevision: number }>
		>(
			`UPDATE "${SCHEMA}"."Resume" r
			 SET summary = $1::jsonb,
			     "lastSummarizedAt" = CURRENT_TIMESTAMP,
			     "embeddingRevision" = r."embeddingRevision" + 1
			 FROM "${SCHEMA}"."ResumeXml" rx
			 WHERE r.id = $2
			   AND rx."resumeId" = r.id
			   AND rx."updatedAt" = $3::timestamptz
			 RETURNING r."embeddingRevision"`,
			JSON.stringify(summary),
			resumeId,
			sourceUpdatedAt,
		);

		return rows[0]?.embeddingRevision ?? null;
	}
}
