import { Injectable } from '@nestjs/common';
import {
	RESUME_XML_SCHEMA_VERSION,
	resumeContentFromXml,
	validateResumeXml,
} from '@resume-builder/entities';

import { PrismaService } from '../../prisma/index.js';

@Injectable()
export class ResumeXmlRepository {
	constructor(private readonly prisma: PrismaService) {}

	async find(uid: string, resumeId: string): Promise<string | null> {
		const rows = await this.prisma.$queryRawUnsafe<Array<{ content: string }>>(
			`SELECT XMLSERIALIZE(DOCUMENT rx."content" AS text) AS "content"
			 FROM "resume_builder"."ResumeXml" rx
			 JOIN "resume_builder"."Resume" r ON r."id" = rx."resumeId"
			 WHERE rx."resumeId" = $1 AND r."uid" = $2`,
			resumeId,
			uid,
		);
		return rows[0]?.content ?? null;
	}

	async upsert(resumeId: string, xml: string): Promise<void> {
		const validation = validateResumeXml(xml);
		if (!validation.valid) {
			throw new Error(`Invalid resume XML: ${validation.errors.join('; ')}`);
		}
		await this.prisma.$executeRawUnsafe(
			`INSERT INTO "resume_builder"."ResumeXml" ("resumeId", "content", "schemaVersion", "updatedAt")
			 VALUES ($1, XMLPARSE(DOCUMENT $2), $3, CURRENT_TIMESTAMP)
			 ON CONFLICT ("resumeId") DO UPDATE
			 SET "content" = EXCLUDED."content",
			     "schemaVersion" = EXCLUDED."schemaVersion",
			     "updatedAt" = CURRENT_TIMESTAMP`,
			resumeId,
			xml,
			RESUME_XML_SCHEMA_VERSION,
		);
	}

	async project(uid: string, resumeId: string) {
		const xml = await this.find(uid, resumeId);
		return xml ? { xml, data: resumeContentFromXml(xml, uid) } : null;
	}

	/**
	 * Execute a server-owned XPath expression. Callers define the expression;
	 * user input is only accepted as bind parameters in the surrounding query.
	 */
	async query(
		xpath: string,
		uid: string,
	): Promise<Array<{ resumeId: string; matches: string[] }>> {
		return this.prisma.$queryRawUnsafe(
			`SELECT rx."resumeId",
			        ARRAY(
			          SELECT XMLSERIALIZE(CONTENT match AS text)
			          FROM unnest(xpath($1, rx."content",
			            ARRAY[ARRAY['res', 'https://mattstrom.com/schemas/resume']])) match
			        ) AS "matches"
			 FROM "resume_builder"."ResumeXml" rx
			 JOIN "resume_builder"."Resume" r ON r."id" = rx."resumeId"
			 WHERE r."uid" = $2`,
			xpath,
			uid,
		);
	}
}
