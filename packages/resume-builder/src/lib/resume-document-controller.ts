import { ApolloClient } from '@apollo/client';
import type { Resume } from '@resume-builder/entities';
import {
	ADD_RESUME_COLLECTION_ITEM,
	REMOVE_RESUME_COLLECTION_ITEM,
	SET_RESUME_FIELD,
} from '../graphql/mutations.ts';
import {
	getResumeCollectionPath,
	ResumeCollections,
} from '../graphql/resume-collections.ts';
import type {
	AddResumeCollectionItemData,
	AddResumeCollectionItemVariables,
	RemoveResumeCollectionItemData,
	RemoveResumeCollectionItemVariables,
	SetResumeFieldData,
	SetResumeFieldVariables,
} from '../graphql/types.ts';
import { reorderItems } from './reorder.ts';

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
	setField(path: string, value: unknown): void | Promise<void>;
	moveArrayItem(
		path: string,
		fromIndex: number,
		toIndex: number,
	): void | Promise<void>;
	addCollectionItem(collection: ResumeCollectionValue): void | Promise<void>;
	removeCollectionItem(
		collection: ResumeCollectionValue,
		index: number,
	): void | Promise<void>;
	undo(): void | Promise<void>;
	redo(): void | Promise<void>;
	destroy(): Promise<void>;
}

interface LocalResumeControllerOptions {
	resume: Resume;
	onSnapshotChange?: (resume: Resume | null) => void;
}

interface ApiResumeControllerOptions extends LocalResumeControllerOptions {
	client: ApolloClient;
	onError?: (error: Error) => void;
}

type ResumeCollectionValue =
	(typeof ResumeCollections)[keyof typeof ResumeCollections];

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function createDefaultCollectionItem(
	collection: ResumeCollectionValue,
	resume: Resume,
) {
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
		const currentItems =
			(this.getValueAtPath(path) as unknown[] | undefined) ?? [];

		this.pushUndoSnapshot();
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

		const path = getResumeCollectionPath(collection);
		const currentItems =
			(this.getValueAtPath(path) as unknown[] | undefined) ?? [];

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

		const currentItems =
			(this.getValueAtPath(path) as unknown[] | undefined) ?? [];
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

export class ApiResumeController extends LocalResumeController {
	private lastPersistedSnapshot: Resume;
	private writeQueue = Promise.resolve();
	private destroyed = false;

	constructor(private readonly apiOptions: ApiResumeControllerOptions) {
		super(apiOptions);
		this.lastPersistedSnapshot = structuredClone(apiOptions.resume);
	}

	override replaceResume(resume: Resume) {
		super.replaceResume(resume);
		this.lastPersistedSnapshot = structuredClone(resume);
	}

	override setField(path: string, value: unknown) {
		const previousSnapshot = this.getSnapshot();
		super.setField(path, value);

		if (!previousSnapshot || !this.snapshot) {
			return;
		}

		this.enqueueWrite(previousSnapshot, async () => {
			const result = await this.apiOptions.client.mutate<
				SetResumeFieldData,
				SetResumeFieldVariables
			>({
				mutation: SET_RESUME_FIELD,
				variables: {
					id: this.resumeId,
					input: { path },
					value,
				},
			});

			return result.data?.setResumeField ?? null;
		});
	}

	override addCollectionItem(collection: ResumeCollectionValue) {
		const previousSnapshot = this.getSnapshot();
		super.addCollectionItem(collection);

		if (!previousSnapshot || !this.snapshot) {
			return;
		}

		this.enqueueWrite(previousSnapshot, async () => {
			const result = await this.apiOptions.client.mutate<
				AddResumeCollectionItemData,
				AddResumeCollectionItemVariables
			>({
				mutation: ADD_RESUME_COLLECTION_ITEM,
				variables: {
					id: this.resumeId,
					input: { collection },
				},
			});

			return result.data?.addResumeCollectionItem ?? null;
		});
	}

	override removeCollectionItem(
		collection: ResumeCollectionValue,
		index: number,
	) {
		const previousSnapshot = this.getSnapshot();
		super.removeCollectionItem(collection, index);

		if (!previousSnapshot || !this.snapshot) {
			return;
		}

		this.enqueueWrite(previousSnapshot, async () => {
			const result = await this.apiOptions.client.mutate<
				RemoveResumeCollectionItemData,
				RemoveResumeCollectionItemVariables
			>({
				mutation: REMOVE_RESUME_COLLECTION_ITEM,
				variables: {
					id: this.resumeId,
					input: { collection, index },
				},
			});

			return result.data?.removeResumeCollectionItem ?? null;
		});
	}

	override moveArrayItem(path: string, fromIndex: number, toIndex: number) {
		const previousSnapshot = this.getSnapshot();
		const beforeMove = structuredClone(previousSnapshot);
		super.moveArrayItem(path, fromIndex, toIndex);

		if (
			!previousSnapshot ||
			!this.snapshot ||
			JSON.stringify(beforeMove) === JSON.stringify(this.snapshot)
		) {
			return;
		}

		const nextValue = this.getValueAtPath(path);
		this.enqueueWrite(previousSnapshot, async () => {
			const result = await this.apiOptions.client.mutate<
				SetResumeFieldData,
				SetResumeFieldVariables
			>({
				mutation: SET_RESUME_FIELD,
				variables: {
					id: this.resumeId,
					input: { path },
					value: nextValue,
				},
			});

			return result.data?.setResumeField ?? null;
		});
	}

	override undo() {
		const previousSnapshot = this.getSnapshot();
		super.undo();
		this.persistCurrentSnapshot(previousSnapshot);
	}

	override redo() {
		const previousSnapshot = this.getSnapshot();
		super.redo();
		this.persistCurrentSnapshot(previousSnapshot);
	}

	override async destroy() {
		this.destroyed = true;
		await this.writeQueue.catch(() => {});
	}

	private persistCurrentSnapshot(previousSnapshot: Resume | null) {
		if (!previousSnapshot || !this.snapshot) {
			return;
		}

		const currentSnapshot = structuredClone(this.snapshot);
		this.enqueueWrite(previousSnapshot, async () => {
			const changes = this.collectChangedFields(
				previousSnapshot,
				currentSnapshot,
			);

			if (changes.length === 0) {
				return currentSnapshot;
			}

			let latestSnapshot: Resume | null = null;

			for (const change of changes) {
				const result = await this.apiOptions.client.mutate<
					SetResumeFieldData,
					SetResumeFieldVariables
				>({
					mutation: SET_RESUME_FIELD,
					variables: {
						id: this.resumeId,
						input: { path: change.path },
						value: change.value,
					},
				});

				latestSnapshot = result.data?.setResumeField ?? latestSnapshot;
			}

			return latestSnapshot ?? currentSnapshot;
		});
	}

	private enqueueWrite(
		previousSnapshot: Resume,
		write: () => Promise<Resume | null>,
	) {
		this.writeQueue = this.writeQueue.then(async () => {
			if (this.destroyed) {
				return;
			}

			try {
				const nextSnapshot = await write();

				if (nextSnapshot) {
					this.lastPersistedSnapshot = structuredClone(nextSnapshot);
					this.snapshot = structuredClone(nextSnapshot);
					this.emitSnapshot();
				} else if (this.snapshot) {
					this.lastPersistedSnapshot = structuredClone(this.snapshot);
				}
			} catch (error) {
				this.snapshot = structuredClone(this.lastPersistedSnapshot);
				this.undoStack = [];
				this.redoStack = [];
				this.emitSnapshot();
				this.apiOptions.onError?.(
					error instanceof Error
						? error
						: new Error('Failed to persist resume changes'),
				);
				throw error;
			}
		});

		this.writeQueue = this.writeQueue.catch(() => {
			this.lastPersistedSnapshot = structuredClone(previousSnapshot);
		});
	}

	private collectChangedFields(
		previousSnapshot: Resume,
		nextSnapshot: Resume,
	) {
		const fields = [
			'data.name',
			'data.title',
			'data.summary',
			'data.contactInformation',
			'data.workExperience',
			'data.education',
			'data.skills',
			'data.skillGroups',
			'data.projects',
			'data.volunteering',
			'name',
			'company',
			'level',
			'jobPostingUrl',
		] as const;

		return fields.flatMap((path) => {
			const previousValue = this.readPathValue(previousSnapshot, path);
			const nextValue = this.readPathValue(nextSnapshot, path);

			if (JSON.stringify(previousValue) === JSON.stringify(nextValue)) {
				return [];
			}

			return [{ path, value: nextValue }];
		});
	}

	private readPathValue(source: Resume, path: string) {
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
		}, source);
	}
}
