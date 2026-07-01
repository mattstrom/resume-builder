import { Extension } from '@hocuspocus/server';
import { Injectable } from '@nestjs/common';
import { Resume } from '@resume-builder/entities';
import * as Y from 'yjs';

import { PrismaService } from './prisma.service.js';

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

type ParsedDocumentName = { kind: 'resume'; resumeId: string } | { kind: 'profile'; uid: string };

@Injectable()
export class StorageService implements Extension {
	constructor(private readonly prisma: PrismaService) {}

	async onLoadDocument({ context, documentName }) {
		return this.loadDocument(context.user.sub as string, documentName);
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

	private readResumeDocument(document: Y.Doc) {
		return fromYValue(document.getMap('resume')) as Resume | null;
	}

	private writeResumeDocument(document: Y.Doc, resume: Resume) {
		syncYMap(document.getMap('resume'), resume as unknown as Record<string, unknown>);
	}

	async assertResumeAccess(uid: string, resumeId: string) {
		const resume = await this.prisma.resume.findFirst({ where: { id: resumeId, uid } });

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
		const stored = await this.prisma.resumeDocument.findUnique({
			where: { name: documentName },
		});
		const document = new Y.Doc();

		if (stored?.update) {
			Y.applyUpdate(document, new Uint8Array(stored.update));

			return document;
		}

		this.writeResumeDocument(document, resume as unknown as Resume);

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
		const snapshot = this.readResumeDocument(document);

		await this.prisma.resumeDocument.upsert({
			where: { name: documentName },
			create: { name: documentName, uid, update },
			update: { update },
		});

		if (!snapshot) {
			return;
		}

		const { id, createdAt, updatedAt, ...resumeUpdate } = snapshot as unknown as Record<
			string,
			unknown
		>;

		await this.prisma.resume.update({ where: { id: resumeId }, data: resumeUpdate });
	}

	private assertProfileAccess(uid: string, profileUid: string) {
		if (uid !== profileUid) {
			throw new Error(`Profile "${profileUid}" is not accessible to user "${uid}"`);
		}
	}

	private async loadProfileDocument(uid: string, documentName: string, profileUid: string) {
		this.assertProfileAccess(uid, profileUid);

		const document = new Y.Doc();
		const latest = await this.prisma.profileUpdate.findFirst({
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

		const previous = await this.prisma.profileUpdate.findFirst({
			where: { name: documentName, uid },
			orderBy: { sequence: 'desc' },
			select: { sequence: true },
		});

		const nextSequence = (previous?.sequence ?? 0) + 1;

		await this.prisma.profileUpdate.create({
			data: { name: documentName, uid, sequence: nextSequence, update },
		});

		// Mirror the narrative as XML to Profile.narrative for downstream
		// consumers (LLM extraction, etc). Y.XmlFragment.toString() returns
		// the Tiptap/ProseMirror doc serialized as XML without needing a
		// schema on the server.
		const narrative = document.getXmlFragment('narrative').toString();
		const jobPreferences = fromYValue(document.getMap('jobPreferences')) as object;

		await this.prisma.profile.upsert({
			where: { uid },
			update: { narrative, jobPreferences },
			create: { uid, narrative, jobPreferences },
		});
	}
}
