import { Extension } from '@hocuspocus/server';
import { Injectable } from '@nestjs/common';
import {
	RESUME_XML_SCHEMA_VERSION,
	Resume,
	ResumeContent,
	resumeToXml,
} from '@resume-builder/entities';
import * as Y from 'yjs';

import { migrateProfileDocument } from './document-migrations.js';
import { PrismaService } from './prisma.service.js';
import { getResumeContent, replaceResumeXml, serializeResumeXml } from './resume-xml-document.js';

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toYValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		const array = new Y.Array<unknown>();
		array.insert(
			0,
			value.map((entry) => toYValue(entry)),
		);

		return array;
	}

	if (isPlainObject(value)) {
		const map = new Y.Map<unknown>();
		syncYMap(map, value);

		return map;
	}

	if (value === undefined) {
		return null;
	}

	return value;
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
		return value.toArray().map((entry) => fromYValue(entry));
	}

	return value;
}

function syncYMap(target: Y.Map<unknown>, values: Record<string, unknown>) {
	for (const [key, value] of Object.entries(values)) {
		target.set(key, toYValue(value));
	}
}

function escapeXml(value: string): string {
	return value.replace(/[&<>'"]/g, (character) => {
		switch (character) {
			case '&':
				return '&amp;';
			case '<':
				return '&lt;';
			case '>':
				return '&gt;';
			case "'":
				return '&apos;';
			case '"':
				return '&quot;';
			default:
				return character;
		}
	});
}

function serializeXmlAttributes(attributes: Record<string, unknown>): string {
	return Object.entries(attributes)
		.map(([name, value]) => ` ${name}="${escapeXml(String(value))}"`)
		.join('');
}

function serializeXmlText(text: Y.XmlText): string {
	const delta = text.toDelta() as Array<{
		insert: string;
		attributes?: Record<string, unknown>;
	}>;

	return delta
		.map(({ insert, attributes }) =>
			Object.entries(attributes ?? {}).reduce(
				(content, [markName, markAttributes]) =>
					`<${markName}${isPlainObject(markAttributes) ? serializeXmlAttributes(markAttributes) : ''}>${content}</${markName}>`,
				escapeXml(insert),
			),
		)
		.join('');
}

function serializeXmlElement(element: Y.XmlElement): string {
	const content = element
		.toArray()
		.map((child) => {
			if (child instanceof Y.XmlElement) {
				return serializeXmlElement(child);
			}

			if (child instanceof Y.XmlText) {
				return serializeXmlText(child);
			}

			return '';
		})
		.join('');
	const nodeName = element.nodeName;

	return `<${nodeName}${serializeXmlAttributes(element.getAttributes())}>${content}</${nodeName}>`;
}

function serializeXmlFragment(fragment: Y.XmlFragment): string {
	return fragment
		.toArray()
		.map((child) => (child instanceof Y.XmlElement ? serializeXmlElement(child) : ''))
		.join('');
}

type ParsedDocumentName = { kind: 'resume'; resumeId: string } | { kind: 'profile'; uid: string };

@Injectable()
export class StorageService implements Extension {
	constructor(private readonly prisma: PrismaService) {}

	async onLoadDocument({ context, documentName }) {
		const uid = context.user.sub as string;
		const document = await this.loadDocument(uid, documentName);
		const parsed = this.parseDocumentName(documentName);

		if (parsed.kind === 'profile' && migrateProfileDocument(document)) {
			await this.storeProfileDocument(uid, documentName, parsed.uid, document);
		}

		return document;
	}

	async onStoreDocument({ context, documentName, document }) {
		await this.storeDocument(context.user.sub as string, documentName, document);
	}

	private parseDocumentName(documentName: string): ParsedDocumentName {
		if (documentName.startsWith('resume:')) {
			return {
				kind: 'resume',
				resumeId: documentName.slice('resume:'.length),
			};
		}

		if (documentName.startsWith('profile:')) {
			return {
				kind: 'profile',
				uid: documentName.slice('profile:'.length),
			};
		}

		throw new Error(`Unsupported document "${documentName}"`);
	}

	async assertResumeAccess(uid: string, resumeId: string) {
		const resume = await this.prisma.resume.findFirst({
			where: { id: resumeId, uid },
		});

		if (!resume) {
			throw new Error(`Resume "${resumeId}" not found`);
		}

		return resume;
	}

	async loadDocument(uid: string, documentName: string) {
		const parsed = this.parseDocumentName(documentName);

		if (parsed.kind === 'resume') {
			return this.loadResumeDocument(uid, documentName, parsed.resumeId);
		}

		return this.loadProfileDocument(uid, documentName, parsed.uid);
	}

	async storeDocument(uid: string, documentName: string, document: Y.Doc) {
		const parsed = this.parseDocumentName(documentName);

		if (parsed.kind === 'resume') {
			await this.storeResumeDocument(uid, documentName, parsed.resumeId, document);

			return;
		}

		await this.storeProfileDocument(uid, documentName, parsed.uid, document);
	}

	private async loadResumeDocument(uid: string, documentName: string, resumeId: string) {
		const resume = await this.assertResumeAccess(uid, resumeId);
		const latest = await this.prisma.documentUpdate.findFirst({
			where: { name: documentName, uid },
			orderBy: { sequence: 'desc' },
		});
		const document = new Y.Doc();

		if (latest?.update) {
			Y.applyUpdate(document, new Uint8Array(latest.update));

			if (document.getXmlFragment('resume').length > 0) {
				return document;
			}

			// Compatibility bridge for a legacy Y.Map snapshot. The offline
			// migration performs this in bulk, but converting on load prevents
			// a missed document from becoming unreadable after deployment.
			const legacy = fromYValue(document.getMap('resume')) as Resume | null;
			const source = legacy?.data ? legacy : this.toResume(resume);
			const migrated = new Y.Doc();
			replaceResumeXml(migrated, resumeToXml(source));
			await this.replaceResumeGenesis(uid, documentName, resumeId, migrated);
			document.destroy();
			return migrated;
		}

		const storedXml = await this.readStoredResumeXml(resumeId);
		replaceResumeXml(document, storedXml ?? resumeToXml(this.toResume(resume)));

		// Persist the genesis snapshot immediately. Without this, the seeded
		// state only exists in memory until Hocuspocus's debounced store
		// fires, and a restart or eviction before then silently drops it,
		// reverting to whatever Postgres had at the next load.
		await this.replaceResumeGenesis(uid, documentName, resumeId, document);

		return document;
	}

	private async storeResumeDocument(
		uid: string,
		documentName: string,
		resumeId: string,
		document: Y.Doc,
	) {
		await this.assertResumeAccess(uid, resumeId);

		const update = Buffer.from(Y.encodeStateAsUpdate(document));
		const xml = serializeResumeXml(document);
		const content = getResumeContent(document, uid);

		const previous = await this.prisma.documentUpdate.findFirst({
			where: { name: documentName, uid },
			orderBy: { sequence: 'desc' },
			select: { sequence: true },
		});

		await this.prisma.$transaction(async (transaction) => {
			await transaction.documentUpdate.create({
				data: {
					name: documentName,
					uid,
					sequence: (previous?.sequence ?? 0) + 1,
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
				resumeId,
				xml,
				RESUME_XML_SCHEMA_VERSION,
			);
			// Temporary compatibility projection for GraphQL consumers. It is
			// derived from XML and is never used to overwrite the XML document.
			await transaction.resume.update({
				where: { id: resumeId },
				data: { data: content as object },
			});
		});
	}

	private toResume(resume: {
		id: string;
		uid: string;
		data: unknown;
		[key: string]: unknown;
	}): Resume {
		return {
			...resume,
			_id: resume.id,
			data: resume.data as ResumeContent,
		} as unknown as Resume;
	}

	private async readStoredResumeXml(resumeId: string): Promise<string | null> {
		const rows = await this.prisma.$queryRawUnsafe<Array<{ content: string }>>(
			`SELECT XMLSERIALIZE(DOCUMENT "content" AS text) AS "content"
			 FROM "ResumeXml" WHERE "resumeId" = $1`,
			resumeId,
		);
		return rows[0]?.content ?? null;
	}

	private async replaceResumeGenesis(
		uid: string,
		documentName: string,
		resumeId: string,
		document: Y.Doc,
	) {
		const xml = serializeResumeXml(document);
		const content = getResumeContent(document, uid);
		const update = Buffer.from(Y.encodeStateAsUpdate(document));

		await this.prisma.$transaction(async (transaction) => {
			await transaction.documentUpdate.deleteMany({
				where: { name: documentName, uid },
			});
			await transaction.documentUpdate.create({
				data: { name: documentName, uid, sequence: 1, update },
			});
			await transaction.$executeRawUnsafe(
				`INSERT INTO "ResumeXml" ("resumeId", "content", "schemaVersion", "updatedAt")
				 VALUES ($1, XMLPARSE(DOCUMENT $2), $3, CURRENT_TIMESTAMP)
				 ON CONFLICT ("resumeId") DO UPDATE
				 SET "content" = EXCLUDED."content",
				     "schemaVersion" = EXCLUDED."schemaVersion",
				     "updatedAt" = CURRENT_TIMESTAMP`,
				resumeId,
				xml,
				RESUME_XML_SCHEMA_VERSION,
			);
			await transaction.resume.update({
				where: { id: resumeId },
				data: { data: content as object },
			});
		});
	}

	private assertProfileAccess(uid: string, profileUid: string) {
		if (uid !== profileUid) {
			throw new Error(`Profile "${profileUid}" is not accessible to user "${uid}"`);
		}
	}

	private async loadProfileDocument(uid: string, documentName: string, profileUid: string) {
		this.assertProfileAccess(uid, profileUid);

		const document = new Y.Doc();
		const latest = await this.prisma.documentUpdate.findFirst({
			where: { name: documentName, uid },
			orderBy: { sequence: 'desc' },
		});

		if (latest?.update) {
			Y.applyUpdate(document, new Uint8Array(latest.update));

			return document;
		}

		// No snapshot yet: return an empty doc. The Tiptap Collaboration
		// extension will create the `narrative` XmlFragment on first edit.
		// We intentionally do not seed from Profile.narrative here — the
		// markdown→ProseMirror parse would need a matching schema and the
		// feature just landed, so there is no legacy content to preserve.

		return document;
	}

	private async storeProfileDocument(
		uid: string,
		documentName: string,
		profileUid: string,
		document: Y.Doc,
	) {
		this.assertProfileAccess(uid, profileUid);

		const update = Buffer.from(Y.encodeStateAsUpdate(document));

		const previous = await this.prisma.documentUpdate.findFirst({
			where: { name: documentName, uid },
			orderBy: { sequence: 'desc' },
			select: { sequence: true },
		});

		const nextSequence = (previous?.sequence ?? 0) + 1;

		await this.prisma.documentUpdate.create({
			data: { name: documentName, uid, sequence: nextSequence, update },
		});

		// Mirror the narrative as XML to Profile.narrative for downstream
		// consumers (LLM extraction, etc). Y.XmlFragment.toString() lowercases
		// tags, so preserve the exact ProseMirror node names ourselves.
		const narrative = serializeXmlFragment(document.getXmlFragment('narrative'));
		const jobPreferences = fromYValue(document.getMap('jobPreferences')) as object;

		await this.prisma.profile.upsert({
			where: { uid },
			update: { narrative, jobPreferences },
			create: { uid, narrative, jobPreferences },
		});
	}
}
