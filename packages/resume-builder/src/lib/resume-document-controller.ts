import { HocuspocusProvider, type WebSocketStatus } from '@hocuspocus/provider';
import type { Resume } from '@resume-builder/entities';
import { ResumeCollections } from '@/graphql/resume-collections.ts';
import type { ResumeCollectionValue } from '@/graphql/resume-collections.ts';
import { ensureAuthToken } from '@/utils/auth.ts';
import { nanoid } from 'nanoid';
import * as Y from 'yjs';
import { IndexedDbDocPersistence } from './indexeddb-doc-persistence.ts';

type YValue =
	| Y.Map<unknown>
	| Y.Array<unknown>
	| string
	| number
	| boolean
	| null;

export type ResumeConnectionStatus =
	| 'idle'
	| 'connecting'
	| 'connected'
	| 'disconnected'
	| 'error';

export interface ResumeDocumentController {
	readonly resumeId: string;
	getSnapshot(): Resume | null;
	replaceResume(resume: Resume): void;
	setField(path: string, value: unknown): void;
	addCollectionItem(collection: ResumeCollectionValue): void;
	removeCollectionItem(collection: ResumeCollectionValue, index: number): void;
	destroy(): Promise<void>;
}

interface CollaborativeResumeControllerOptions {
	resume: Resume;
	url: string;
	onSnapshotChange?: (resume: Resume | null) => void;
	onStatusChange?: (status: ResumeConnectionStatus) => void;
}

interface LocalResumeControllerOptions {
	resume: Resume;
	onSnapshotChange?: (resume: Resume | null) => void;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toYValue(value: unknown): YValue {
	if (Array.isArray(value)) {
		const array = new Y.Array<unknown>();
		array.insert(
			0,
			value
				.filter((item) => item !== undefined)
				.map((item) => toYValue(item)),
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

	return value as Exclude<YValue, Y.Map<unknown> | Y.Array<unknown>>;
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

function syncYArray(target: Y.Array<unknown>, values: unknown[]) {
	target.delete(0, target.length);
	target.insert(
		0,
		values
			.filter((value) => value !== undefined)
			.map((value) => toYValue(value)),
	);
}

function syncYMap(target: Y.Map<unknown>, values: Record<string, unknown>) {
	const nextKeys = new Set(
		Object.entries(values)
			.filter(([, value]) => value !== undefined)
			.map(([key]) => key),
	);

	for (const key of Array.from(target.keys())) {
		if (!nextKeys.has(key)) {
			target.delete(key);
		}
	}

	for (const [key, value] of Object.entries(values)) {
		if (value === undefined) {
			target.delete(key);
			continue;
		}

		const existing = target.get(key);

		if (existing instanceof Y.Map && isPlainObject(value)) {
			syncYMap(existing, value);
			continue;
		}

		if (existing instanceof Y.Array && Array.isArray(value)) {
			syncYArray(existing, value);
			continue;
		}

		target.set(key, toYValue(value));
	}
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
		current = (current as Record<string, unknown>)[key] as
			| Record<string, unknown>
			| unknown[];
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

function createContainerForSegment(nextSegment: string | number | undefined) {
	return typeof nextSegment === 'number'
		? new Y.Array<unknown>()
		: new Y.Map<unknown>();
}

function ensureArrayIndex(
	array: Y.Array<unknown>,
	index: number,
	nextSegment: string | number | undefined,
) {
	while (array.length <= index) {
		array.insert(array.length, [createContainerForSegment(nextSegment)]);
	}
}

function getChild(
	parent: Y.Map<unknown> | Y.Array<unknown>,
	segment: string | number,
) {
	if (parent instanceof Y.Map) {
		return parent.get(String(segment));
	}

	return parent.get(segment);
}

function setChild(
	parent: Y.Map<unknown> | Y.Array<unknown>,
	segment: string | number,
	value: unknown,
) {
	const yValue = toYValue(value);

	if (parent instanceof Y.Map) {
		parent.set(String(segment), yValue);
		return;
	}

	const index = Number(segment);

	if (index < parent.length) {
		parent.delete(index, 1);
		parent.insert(index, [yValue]);
		return;
	}

	ensureArrayIndex(parent, index, undefined);
	parent.delete(index, 1);
	parent.insert(index, [yValue]);
}

function readResume(root: Y.Map<unknown>): Resume | null {
	if (root.size === 0) {
		return null;
	}

	return fromYValue(root) as Resume;
}

function resolveCrdtUrl(configuredUrl?: string) {
	const normalizedUrl = configuredUrl?.trim();

	if (!normalizedUrl) {
		if (typeof window === 'undefined') {
			return 'ws://localhost:1234';
		}

		const url = new URL(window.location.origin);
		url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		url.port = url.port || (url.protocol === 'wss:' ? '443' : '1234');
		url.pathname = '/';
		return url.toString();
	}

	if (
		normalizedUrl.startsWith('ws://') ||
		normalizedUrl.startsWith('wss://')
	) {
		return normalizedUrl;
	}

	if (
		normalizedUrl.startsWith('http://') ||
		normalizedUrl.startsWith('https://')
	) {
		const url = new URL(normalizedUrl);
		url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
		return url.toString();
	}

	if (typeof window === 'undefined') {
		return normalizedUrl;
	}

	const url = new URL(normalizedUrl, window.location.origin);
	url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
	return url.toString();
}

function mapProviderStatus(status: WebSocketStatus): ResumeConnectionStatus {
	switch (status) {
		case 'connected':
			return 'connected';
		case 'connecting':
			return 'connecting';
		default:
			return 'disconnected';
	}
}

function createDefaultCollectionItem(
	collection: ResumeCollectionValue,
	resume: Resume,
) {
	const base = {
		_id: nanoid(),
		uid: resume.uid,
	};

	switch (collection) {
		case ResumeCollections.WORK_EXPERIENCE:
			return {
				...base,
				company: '',
				position: 'New Role',
				location: '',
				startDate: '',
				endDate: '',
				responsibilities: [],
			};
		case ResumeCollections.PROJECTS:
			return {
				...base,
				name: 'New Project',
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

function getCollectionPath(collection: ResumeCollectionValue) {
	switch (collection) {
		case ResumeCollections.WORK_EXPERIENCE:
			return 'data.workExperience';
		case ResumeCollections.PROJECTS:
			return 'data.projects';
		case ResumeCollections.VOLUNTEERING:
			return 'data.volunteering';
		default:
			throw new Error(`Unsupported collection "${collection}"`);
	}
}

export class CollaborativeResumeController
	implements ResumeDocumentController
{
	readonly resumeId: string;

	private readonly document = new Y.Doc();
	private readonly root = this.document.getMap('resume');
	private readonly persistence: IndexedDbDocPersistence;
	private readonly provider: HocuspocusProvider;
	private destroyed = false;

	constructor(
		private readonly options: CollaborativeResumeControllerOptions,
	) {
		this.resumeId = options.resume._id;
		this.persistence = new IndexedDbDocPersistence(
			`resume:${this.resumeId}`,
			this.document,
		);
		this.document.on('update', this.handleDocumentUpdate);
		this.provider = new HocuspocusProvider({
			url: resolveCrdtUrl(options.url),
			name: `resume:${this.resumeId}`,
			document: this.document,
			token: async () => {
				try {
					return await ensureAuthToken();
				} catch {
					return '';
				}
			},
			onStatus: ({ status }) => {
				this.options.onStatusChange?.(mapProviderStatus(status));
			},
			onAuthenticationFailed: () => {
				this.options.onStatusChange?.('error');
			},
		});

		this.options.onStatusChange?.('connecting');
		void this.initialize();
	}

	private async initialize() {
		await this.persistence.ready;

		if (this.destroyed) {
			return;
		}

		if (this.root.size === 0) {
			this.replaceResume(this.options.resume);
		} else {
			this.emitSnapshot();
		}
	}

	private readonly handleDocumentUpdate = () => {
		this.emitSnapshot();
	};

	private emitSnapshot() {
		this.options.onSnapshotChange?.(readResume(this.root));
	}

	getSnapshot() {
		return readResume(this.root);
	}

	replaceResume(resume: Resume) {
		this.document.transact(() => {
			syncYMap(this.root, resume as unknown as Record<string, unknown>);
		}, 'resume:replace');
	}

	setField(path: string, value: unknown) {
		const segments = parsePath(path);

		if (segments.length === 0) {
			return;
		}

		this.document.transact(() => {
			let current: Y.Map<unknown> | Y.Array<unknown> = this.root;

			for (let index = 0; index < segments.length - 1; index += 1) {
				const segment = segments[index]!;
				const nextSegment = segments[index + 1];
				let next = getChild(current, segment);

				if (!(next instanceof Y.Map) && !(next instanceof Y.Array)) {
					next = createContainerForSegment(nextSegment);

					if (current instanceof Y.Map) {
						current.set(String(segment), next);
					} else {
						const arrayIndex = Number(segment);
						ensureArrayIndex(current, arrayIndex, nextSegment);
						current.delete(arrayIndex, 1);
						current.insert(arrayIndex, [next]);
					}
				}

				current = next;
			}

			setChild(current, segments[segments.length - 1]!, value);
		}, 'resume:set-field');
	}

	addCollectionItem(collection: ResumeCollectionValue) {
		const snapshot = this.getSnapshot() ?? this.options.resume;
		const path = getCollectionPath(collection);
		const currentItems =
			(this.getValueAtPath(path) as unknown[] | undefined) ?? [];

		this.setField(path, [
			...currentItems,
			createDefaultCollectionItem(collection, snapshot),
		]);
	}

	removeCollectionItem(collection: ResumeCollectionValue, index: number) {
		const path = getCollectionPath(collection);
		const currentItems =
			(this.getValueAtPath(path) as unknown[] | undefined) ?? [];

		this.setField(
			path,
			currentItems.filter((_, itemIndex) => itemIndex !== index),
		);
	}

	private getValueAtPath(path: string) {
		const snapshot = this.getSnapshot();

		if (!snapshot) {
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
		}, snapshot);
	}

	async destroy() {
		this.destroyed = true;
		this.document.off('update', this.handleDocumentUpdate);
		await this.persistence.destroy();
		this.provider.destroy();
		this.document.destroy();
	}
}

export class LocalResumeController implements ResumeDocumentController {
	readonly resumeId: string;

	private snapshot: Resume | null;

	constructor(private readonly options: LocalResumeControllerOptions) {
		this.resumeId = options.resume._id;
		this.snapshot = options.resume;
	}

	getSnapshot() {
		return this.snapshot;
	}

	private emitSnapshot() {
		this.options.onSnapshotChange?.(this.snapshot);
	}

	replaceResume(resume: Resume) {
		this.snapshot = structuredClone(resume);
		this.emitSnapshot();
	}

	setField(path: string, value: unknown) {
		if (!this.snapshot) {
			return;
		}

		this.snapshot = cloneWithPathValue(this.snapshot, path, value);
		this.emitSnapshot();
	}

	addCollectionItem(collection: ResumeCollectionValue) {
		if (!this.snapshot) {
			return;
		}

		const path = getCollectionPath(collection);
		const currentItems =
			(this.getValueAtPath(path) as unknown[] | undefined) ?? [];

		this.snapshot = cloneWithPathValue(this.snapshot, path, [
			...currentItems,
			createDefaultCollectionItem(collection, this.snapshot),
		]);
		this.emitSnapshot();
	}

	removeCollectionItem(collection: ResumeCollectionValue, index: number) {
		if (!this.snapshot) {
			return;
		}

		const path = getCollectionPath(collection);
		const currentItems =
			(this.getValueAtPath(path) as unknown[] | undefined) ?? [];

		this.snapshot = cloneWithPathValue(
			this.snapshot,
			path,
			currentItems.filter((_, itemIndex) => itemIndex !== index),
		);
		this.emitSnapshot();
	}

	private getValueAtPath(path: string) {
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
