import { Extension } from '@hocuspocus/server';
import { Document as StoredDocument } from './document.js';
import { Resume } from '@resume-builder/entities';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as Y from 'yjs';

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

@Injectable()
export class StorageService implements Extension {
	constructor(
		@InjectModel(Resume.name) private readonly resumeModel: Model<Resume>,
		@InjectModel(StoredDocument.name)
		private readonly documentModel: Model<StoredDocument>,
	) {}

	async onLoadDocument({ context, documentName }) {
		return this.loadDocument(context.user.sub as string, documentName);
	}

	async onStoreDocument({ context, documentName, document }) {
		await this.storeDocument(
			context.user.sub as string,
			documentName,
			document,
		);
	}

	private parseDocumentName(documentName: string) {
		if (!documentName.startsWith('resume:')) {
			throw new Error(`Unsupported document "${documentName}"`);
		}

		return documentName.slice('resume:'.length);
	}

	private readResumeDocument(document: Y.Doc) {
		return fromYValue(document.getMap('resume')) as Resume | null;
	}

	private writeResumeDocument(document: Y.Doc, resume: Resume) {
		syncYMap(
			document.getMap('resume'),
			resume as unknown as Record<string, unknown>,
		);
	}

	async assertResumeAccess(uid: string, documentName: string) {
		const resumeId = this.parseDocumentName(documentName);
		const resume = await this.resumeModel
			.findOne({ _id: resumeId, uid })
			.exec();

		if (!resume) {
			throw new Error(`Resume "${resumeId}" not found`);
		}

		return resume;
	}

	async loadDocument(uid: string, documentName: string) {
		const resume = await this.assertResumeAccess(uid, documentName);
		const stored = await this.documentModel
			.findOne({ name: documentName, uid })
			.exec();
		const document = new Y.Doc();

		if (stored?.update) {
			Y.applyUpdate(document, new Uint8Array(stored.update));
			return document;
		}

		this.writeResumeDocument(document, resume.toObject());
		return document;
	}

	async storeDocument(uid: string, documentName: string, document: Y.Doc) {
		await this.assertResumeAccess(uid, documentName);

		const update = Buffer.from(Y.encodeStateAsUpdate(document));
		const snapshot = this.readResumeDocument(document);

		await this.documentModel
			.findOneAndUpdate(
				{ name: documentName, uid },
				{ name: documentName, uid, update },
				{ upsert: true, new: true },
			)
			.exec();

		if (!snapshot) {
			return;
		}

		const { _id, createdAt, updatedAt, ...resumeUpdate } =
			snapshot as Resume & {
				createdAt?: Date;
				updatedAt?: Date;
			};

		await this.resumeModel
			.findOneAndUpdate(
				{ _id: this.parseDocumentName(documentName), uid },
				resumeUpdate,
			)
			.exec();
	}
}
