import { PrismaPg } from '@prisma/adapter-pg';
import {
	RESUME_XML_SCHEMA_VERSION,
	type Resume,
	type ResumeContent,
	resumeToXml,
} from '@resume-builder/entities';
import * as Y from 'yjs';

import { PrismaClient } from '../generated/prisma/client.js';
import {
	getResumeContent,
	replaceResumeXml,
	serializeResumeXml,
} from '../modules/storage/resume-xml-document.js';

const apply = process.argv.includes('--apply');
const connectionString =
	process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/resume-builder';
const prisma = new PrismaClient({
	adapter: new PrismaPg(connectionString, { schema: 'resume_builder' }),
});

function fromYValue(value: unknown): unknown {
	if (value instanceof Y.Map) {
		return Object.fromEntries(
			[...value.entries()].map(([key, entry]) => [key, fromYValue(entry)]),
		);
	}
	if (value instanceof Y.Array) return value.toArray().map(fromYValue);
	return value;
}

async function main() {
	const resumes = await prisma.resume.findMany();
	const failures: Array<{ resumeId: string; error: string }> = [];

	for (const row of resumes) {
		try {
			const documentName = `resume:${row.id}`;
			const latest = await prisma.documentUpdate.findFirst({
				where: { name: documentName, uid: row.uid },
				orderBy: { sequence: 'desc' },
			});
			const legacyDocument = new Y.Doc();
			if (latest) Y.applyUpdate(legacyDocument, new Uint8Array(latest.update));

			let xml: string;
			if (legacyDocument.getXmlFragment('resume').length > 0) {
				xml = serializeResumeXml(legacyDocument);
			} else {
				const legacy = fromYValue(legacyDocument.getMap('resume')) as Resume | undefined;
				const resume = {
					...row,
					...(legacy?.data ? legacy : {}),
					_id: row.id,
					id: row.id,
					uid: row.uid,
					data: (legacy?.data ?? row.data) as ResumeContent,
				} as unknown as Resume;
				xml = resumeToXml(resume);
			}

			const next = new Y.Doc();
			replaceResumeXml(next, xml);
			const canonicalXml = serializeResumeXml(next);
			const projection = getResumeContent(next, row.uid);
			const update = Buffer.from(Y.encodeStateAsUpdate(next));

			if (apply) {
				await prisma.$transaction(async (transaction) => {
					await transaction.documentUpdate.deleteMany({
						where: { name: documentName, uid: row.uid },
					});
					await transaction.documentUpdate.create({
						data: {
							name: documentName,
							uid: row.uid,
							sequence: 1,
							update,
						},
					});
					await transaction.$executeRawUnsafe(
						`INSERT INTO "ResumeXml" ("resumeId", "content", "schemaVersion", "updatedAt")
						 VALUES ($1, XMLPARSE(DOCUMENT $2), $3, CURRENT_TIMESTAMP)
						 ON CONFLICT ("resumeId") DO UPDATE
						 SET "content" = EXCLUDED."content",
						     "schemaVersion" = EXCLUDED."schemaVersion",
						     "updatedAt" = CURRENT_TIMESTAMP`,
						row.id,
						canonicalXml,
						RESUME_XML_SCHEMA_VERSION,
					);
					await transaction.resume.update({
						where: { id: row.id },
						data: { data: projection as object },
					});
				});
			}
			console.log(`${apply ? 'migrated' : 'validated'} ${row.id}`);
		} catch (error) {
			failures.push({
				resumeId: row.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	if (failures.length > 0) {
		console.error(JSON.stringify({ failures }, null, 2));
		process.exitCode = 1;
		return;
	}
	console.log(`${apply ? 'Migrated' : 'Validated'} ${resumes.length} resumes`);
	if (!apply) console.log('Dry run only. Re-run with --apply during the maintenance window.');
}

await main().finally(() => prisma.$disconnect());
