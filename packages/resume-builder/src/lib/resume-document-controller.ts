import { HocuspocusProvider } from '@hocuspocus/provider';
import type { Resume } from '@resume-builder/entities';
import { nanoid } from 'nanoid';
import * as Y from 'yjs';

import { getResumeCollectionPath, ResumeCollections } from '../graphql/resume-collections.ts';
import { reorderItems } from './reorder.ts';

export type ResumeConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface ResumeDocumentController {
	readonly resumeId: string;
	getSnapshot(): Resume | null;
	replaceResume(resume: Resume): void;
	setField(path: string, value: unknown): void | Promise<void>;
	moveArrayItem(path: string, fromIndex: number, toIndex: number): void | Promise<void>;
	addCollectionItem(collection: ResumeCollectionValue): void | Promise<void>;
	insertCollectionItem(collection: ResumeCollectionValue, index: number): void | Promise<void>;
	removeCollectionItem(collection: ResumeCollectionValue, index: number): void | Promise<void>;
	undo(): void | Promise<void>;
	redo(): void | Promise<void>;
	destroy(): Promise<void>;
}

interface LocalResumeControllerOptions {
	resume: Resume;
	onSnapshotChange?: (resume: Resume | null) => void;
}

type ResumeCollectionValue = (typeof ResumeCollections)[keyof typeof ResumeCollections];

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
		for (const [key, entry] of Object.entries(value)) {
			map.set(key, toYValue(entry));
		}
		return map;
	}

	return value === undefined ? null : value;
}

function fromYValue(value: unknown): unknown {
	if (value instanceof Y.Map) {
		return Object.fromEntries(
			[...value.entries()].map(([key, entry]) => [key, fromYValue(entry)]),
		);
	}

	if (value instanceof Y.Array) {
		return value.toArray().map((entry) => fromYValue(entry));
	}

	return value;
}

function parsePath(path: string) {
	return path.split('.').map((segment) => {
		return /^\d+$/.test(segment) ? Number(segment) : segment;
	});
}

function cloneWithPathValue<T>(source: T, path: string, value: unknown): T {
	const clone = structuredClone(source) as Record<string, unknown>;
	const segments = parsePath(path);
	let current: Record<string, unknown> | unknown[] = clone;

	for (let index = 0; index < segments.length - 1; index += 1) {
		const segment = segments[index]!;
		const nextSegment = segments[index + 1];
		const key = String(segment);
		const nextValue =
			(current as Record<string, unknown>)[key] ??
			(typeof nextSegment === 'number' ? [] : {});

		(current as Record<string, unknown>)[key] = structuredClone(nextValue);
		current = (current as Record<string, unknown>)[key] as Record<string, unknown> | unknown[];
	}

	if (segments.length === 0) {
		return clone as T;
	}

	const lastSegment = segments[segments.length - 1]!;

	if (Array.isArray(current) && typeof lastSegment === 'number') {
		current[lastSegment] = value;
		return clone as T;
	}

	(current as Record<string, unknown>)[String(lastSegment)] = value;
	return clone as T;
}

function createDefaultCollectionItem(collection: ResumeCollectionValue, resume: Resume) {
	const base = {
		uid: resume.uid,
	};

	switch (collection) {
		case ResumeCollections.WORK_EXPERIENCE:
			return {
				...base,
				company: resume.company ?? '',
				position: 'New Role',
				location: '',
				startDate: '',
				endDate: '',
				responsibilities: [],
			};
		case ResumeCollections.PROJECTS:
			return {
				...base,
				_id: nanoid(),
				name: 'New Project',
				description: '',
				technologies: [],
				items: [],
				type: '',
			};
		case ResumeCollections.VOLUNTEERING:
			return {
				...base,
				organization: '',
				position: 'New Role',
				location: '',
				startDate: '',
				endDate: '',
				responsibilities: [],
			};
		default:
			throw new Error(`Unsupported collection "${collection}"`);
	}
}

export class LocalResumeController implements ResumeDocumentController {
	readonly resumeId: string;

	protected snapshot: Resume | null;
	protected undoStack: Resume[] = [];
	protected redoStack: Resume[] = [];

	constructor(protected readonly options: LocalResumeControllerOptions) {
		this.resumeId = options.resume._id;
		this.snapshot = structuredClone(options.resume);
	}

	getSnapshot() {
		return this.snapshot;
	}

	protected emitSnapshot() {
		this.options.onSnapshotChange?.(this.snapshot);
	}

	protected pushUndoSnapshot() {
		if (!this.snapshot) {
			return;
		}

		this.undoStack.push(structuredClone(this.snapshot));
		this.redoStack = [];
	}

	replaceResume(resume: Resume) {
		if (!isPlainObject(resume.data)) {
			throw new Error(
				'replaceResume() requires a full Resume object with a `data` property ' +
					'containing the resume content (e.g. `{ data: { name, workExperience, ... } }`).',
			);
		}

		this.snapshot = structuredClone(resume);
		this.undoStack = [];
		this.redoStack = [];
		this.emitSnapshot();
	}

	setField(path: string, value: unknown) {
		if (!this.snapshot) {
			return;
		}

		this.pushUndoSnapshot();
		this.snapshot = cloneWithPathValue(this.snapshot, path, value);
		this.emitSnapshot();
	}

	addCollectionItem(collection: ResumeCollectionValue) {
		if (!this.snapshot) {
			return;
		}

		const path = getResumeCollectionPath(collection);
		const currentItems = (this.getValueAtPath(path) as unknown[] | undefined) ?? [];

		this.pushUndoSnapshot();
		this.snapshot = cloneWithPathValue(this.snapshot, path, [
			...currentItems,
			createDefaultCollectionItem(collection, this.snapshot),
		]);
		this.emitSnapshot();
	}

	insertCollectionItem(collection: ResumeCollectionValue, index: number) {
		if (!this.snapshot) {
			return;
		}

		const path = getResumeCollectionPath(collection);
		const currentItems = (this.getValueAtPath(path) as unknown[] | undefined) ?? [];
		const clampedIndex = Math.max(0, Math.min(index, currentItems.length));

		this.pushUndoSnapshot();
		this.snapshot = cloneWithPathValue(this.snapshot, path, [
			...currentItems.slice(0, clampedIndex),
			createDefaultCollectionItem(collection, this.snapshot),
			...currentItems.slice(clampedIndex),
		]);
		this.emitSnapshot();
	}

	removeCollectionItem(collection: ResumeCollectionValue, index: number) {
		if (!this.snapshot) {
			return;
		}

		const path = getResumeCollectionPath(collection);
		const currentItems = (this.getValueAtPath(path) as unknown[] | undefined) ?? [];

		this.pushUndoSnapshot();
		this.snapshot = cloneWithPathValue(
			this.snapshot,
			path,
			currentItems.filter((_, itemIndex) => itemIndex !== index),
		);
		this.emitSnapshot();
	}

	moveArrayItem(path: string, fromIndex: number, toIndex: number) {
		if (!this.snapshot) {
			return;
		}

		const currentItems = (this.getValueAtPath(path) as unknown[] | undefined) ?? [];
		const nextItems = reorderItems(currentItems, fromIndex, toIndex);

		if (
			nextItems.length === currentItems.length &&
			nextItems.every((item, index) => item === currentItems[index])
		) {
			return;
		}

		this.pushUndoSnapshot();
		this.snapshot = cloneWithPathValue(this.snapshot, path, nextItems);
		this.emitSnapshot();
	}

	undo() {
		if (!this.snapshot) {
			return;
		}

		const previousSnapshot = this.undoStack.pop();

		if (!previousSnapshot) {
			return;
		}

		this.redoStack.push(structuredClone(this.snapshot));
		this.snapshot = previousSnapshot;
		this.emitSnapshot();
	}

	redo() {
		if (!this.snapshot) {
			return;
		}

		const nextSnapshot = this.redoStack.pop();

		if (!nextSnapshot) {
			return;
		}

		this.undoStack.push(structuredClone(this.snapshot));
		this.snapshot = nextSnapshot;
		this.emitSnapshot();
	}

	protected getValueAtPath(path: string) {
		if (!this.snapshot) {
			return undefined;
		}

		return parsePath(path).reduce<unknown>((current, segment) => {
			if (current == null) {
				return undefined;
			}

			if (typeof segment === 'number' && Array.isArray(current)) {
				return current[segment];
			}

			if (isPlainObject(current)) {
				return current[String(segment)];
			}

			return undefined;
		}, this.snapshot);
	}

	async destroy() {}
}

const LOCAL_ORIGIN = Symbol('resume-editor');
const CONNECT_TIMEOUT_MS = 10_000;

interface CrdtResumeControllerOptions {
	resumeId: string;
	collaborationUrl: string;
	token: string;
	onSnapshotChange?: (resume: Resume | null) => void;
	onError?: (error: Error) => void;
}

/**
 * The editor's authoritative resume state. Every mutation is made directly to
 * the shared Yjs document, so UI edits and agent edits cannot overwrite one
 * another through the legacy GraphQL persistence path.
 */
export class CrdtResumeController implements ResumeDocumentController {
	readonly resumeId: string;
	private readonly doc = new Y.Doc();
	private readonly root = this.doc.getMap<unknown>('resume');
	private readonly undoManager = new Y.UndoManager(this.root, {
		trackedOrigins: new Set([LOCAL_ORIGIN]),
	});
	private readonly provider: HocuspocusProvider;
	private snapshot: Resume | null = null;
	private destroyed = false;

	private constructor(private readonly options: CrdtResumeControllerOptions) {
		this.resumeId = options.resumeId;
		this.provider = new HocuspocusProvider({
			url: options.collaborationUrl,
			name: `resume:${this.resumeId}`,
			document: this.doc,
			token: options.token,
		});
	}

	static async connect(options: CrdtResumeControllerOptions) {
		const controller = new CrdtResumeController(options);

		try {
			await controller.waitForSync();
			controller.root.observeDeep(controller.handleDocumentChange);
			controller.updateSnapshot();
			return controller;
		} catch (error) {
			await controller.destroy();
			throw error;
		}
	}

	getSnapshot() {
		return this.snapshot;
	}

	replaceResume(resume: Resume) {
		if (!isPlainObject(resume.data)) {
			throw new Error(
				'replaceResume() requires a full Resume object with a `data` property ' +
					'containing the resume content (e.g. `{ data: { name, workExperience, ... } }`). ' +
					'Passing resume content directly writes it to the top level of the document ' +
					'instead of under `data`, which breaks every reader of the document.',
			);
		}

		this.doc.transact(() => {
			for (const key of [...this.root.keys()]) {
				this.root.delete(key);
			}

			for (const [key, value] of Object.entries(resume)) {
				if (key !== '_id') {
					this.root.set(key, toYValue(value));
				}
			}
			this.root.set('id', this.resumeId);
		}, LOCAL_ORIGIN);
	}

	setField(path: string, value: unknown) {
		this.doc.transact(() => {
			this.setPathValue(path, value);
		}, LOCAL_ORIGIN);
	}

	addCollectionItem(collection: ResumeCollectionValue) {
		const snapshot = this.getSnapshot();
		if (!snapshot) return;

		const path = getResumeCollectionPath(collection);
		const items = (fromYValue(this.getPathValue(path)) as unknown[] | undefined) ?? [];
		this.setField(path, [...items, createDefaultCollectionItem(collection, snapshot)]);
	}

	insertCollectionItem(collection: ResumeCollectionValue, index: number) {
		const snapshot = this.getSnapshot();
		if (!snapshot) return;

		const path = getResumeCollectionPath(collection);
		const items = (fromYValue(this.getPathValue(path)) as unknown[] | undefined) ?? [];
		const position = Math.max(0, Math.min(index, items.length));
		this.setField(path, [
			...items.slice(0, position),
			createDefaultCollectionItem(collection, snapshot),
			...items.slice(position),
		]);
	}

	removeCollectionItem(collection: ResumeCollectionValue, index: number) {
		const path = getResumeCollectionPath(collection);
		const items = (fromYValue(this.getPathValue(path)) as unknown[] | undefined) ?? [];
		this.setField(
			path,
			items.filter((_, itemIndex) => itemIndex !== index),
		);
	}

	moveArrayItem(path: string, fromIndex: number, toIndex: number) {
		const items = fromYValue(this.getPathValue(path)) as unknown[] | undefined;
		if (!items) return;

		const reordered = reorderItems(items, fromIndex, toIndex);
		if (JSON.stringify(items) !== JSON.stringify(reordered)) {
			this.setField(path, reordered);
		}
	}

	undo() {
		this.undoManager.undo();
	}

	redo() {
		this.undoManager.redo();
	}

	async destroy() {
		if (this.destroyed) return;
		this.destroyed = true;
		this.root.unobserveDeep(this.handleDocumentChange);
		this.undoManager.destroy();
		this.provider.destroy();
		this.doc.destroy();
	}

	private async waitForSync() {
		if (this.provider.isSynced) {
			return;
		}

		await new Promise<void>((resolve, reject) => {
			const timeout = window.setTimeout(() => {
				reject(new Error(`Timed out connecting to resume:${this.resumeId}`));
			}, CONNECT_TIMEOUT_MS);
			const complete = (callback: () => void) => {
				window.clearTimeout(timeout);
				callback();
			};

			this.provider.on('synced', () => complete(resolve));
			this.provider.on('authenticationFailed', ({ reason }: { reason: string }) =>
				complete(() => reject(new Error(`CRDT authentication failed: ${reason}`))),
			);
		});
	}

	private readonly handleDocumentChange = () => {
		this.updateSnapshot();
	};

	private updateSnapshot() {
		const stored = fromYValue(this.root) as Record<string, unknown>;
		const { id, ...resume } = stored;

		// A document without a `data` payload isn't a usable resume snapshot
		// (e.g. it was never hydrated, or `replaceResume` was given malformed
		// content that landed at the top level instead of under `data`).
		// Report it as absent so callers fall back to the Postgres-sourced
		// resume instead of handing readers a snapshot with no content.
		if (!isPlainObject(resume.data)) {
			this.snapshot = null;
			this.options.onSnapshotChange?.(null);
			return;
		}

		this.snapshot = {
			...resume,
			_id: String(id ?? this.resumeId),
		} as Resume;
		this.options.onSnapshotChange?.(this.snapshot);
	}

	private getPathValue(path: string) {
		return parsePath(path).reduce<unknown>((current, segment) => {
			if (current instanceof Y.Map) return current.get(String(segment));
			if (current instanceof Y.Array && typeof segment === 'number') {
				return current.get(segment);
			}
			return undefined;
		}, this.root);
	}

	private setPathValue(path: string, value: unknown) {
		const segments = parsePath(path);
		let current: Y.Map<unknown> | Y.Array<unknown> = this.root;

		for (let index = 0; index < segments.length - 1; index += 1) {
			const segment = segments[index]!;
			const nextSegment = segments[index + 1]!;
			const existing: unknown =
				current instanceof Y.Map
					? current.get(String(segment))
					: typeof segment === 'number'
						? current.get(segment)
						: undefined;
			const next: Y.Map<unknown> | Y.Array<unknown> =
				existing instanceof Y.Map || existing instanceof Y.Array
					? existing
					: typeof nextSegment === 'number'
						? new Y.Array<unknown>()
						: new Y.Map<unknown>();

			if (next !== existing) {
				if (current instanceof Y.Map) {
					current.set(String(segment), next);
				} else if (typeof segment === 'number') {
					current.delete(segment, 1);
					current.insert(segment, [next]);
				}
			}

			current = next;
		}

		const last = segments.at(-1);
		if (last === undefined) return;

		if (current instanceof Y.Map) {
			current.set(String(last), toYValue(value));
		} else if (typeof last === 'number') {
			current.delete(last, 1);
			current.insert(last, [toYValue(value)]);
		}
	}
}
