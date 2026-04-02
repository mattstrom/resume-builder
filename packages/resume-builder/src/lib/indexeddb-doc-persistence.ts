import * as Y from 'yjs';

const DATABASE_NAME = 'resume-builder-crdt';
const STORE_NAME = 'documents';

function createRequestPromise<T>(request: IDBRequest<T>) {
	return new Promise<T>((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

function openDatabase() {
	return new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open(DATABASE_NAME, 1);

		request.onupgradeneeded = () => {
			const db = request.result;

			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME);
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

export class IndexedDbDocPersistence {
	readonly ready: Promise<void>;

	private readonly databasePromise: Promise<IDBDatabase> | null;
	private destroyed = false;
	private flushScheduled = false;

	constructor(
		private readonly documentName: string,
		private readonly document: Y.Doc,
	) {
		this.databasePromise =
			typeof indexedDB === 'undefined' ? null : openDatabase();
		this.ready = this.initialize();
	}

	private async initialize() {
		if (!this.databasePromise) {
			return;
		}

		const db = await this.databasePromise;
		const transaction = db.transaction(STORE_NAME, 'readonly');
		const store = transaction.objectStore(STORE_NAME);
		const stored = await createRequestPromise(store.get(this.documentName));

		if (stored instanceof Uint8Array) {
			Y.applyUpdate(this.document, stored, 'indexeddb');
		} else if (stored instanceof ArrayBuffer) {
			Y.applyUpdate(this.document, new Uint8Array(stored), 'indexeddb');
		}

		this.document.on('update', this.handleDocumentUpdate);
	}

	private readonly handleDocumentUpdate = () => {
		if (this.destroyed || !this.databasePromise || this.flushScheduled) {
			return;
		}

		this.flushScheduled = true;

		queueMicrotask(() => {
			this.flushScheduled = false;
			void this.persist();
		});
	};

	async persist() {
		if (!this.databasePromise || this.destroyed) {
			return;
		}

		const db = await this.databasePromise;
		const transaction = db.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		const update = Y.encodeStateAsUpdate(this.document);

		await createRequestPromise(store.put(update, this.documentName));
	}

	async destroy() {
		this.destroyed = true;
		this.document.off('update', this.handleDocumentUpdate);
		await this.persist();
	}
}
