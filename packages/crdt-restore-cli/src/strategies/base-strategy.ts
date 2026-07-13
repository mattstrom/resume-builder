import * as Y from 'yjs';

import { DocumentUpdateRecord, StorageService } from '../storage/storage-service';

export interface RestorationContext {
	name: string;
	uid: string;
	selectedSequence: number;
	allUpdates: DocumentUpdateRecord[];
	targetUpdates: DocumentUpdateRecord[];
	useLocalTimezone: boolean;
}

export interface RestorationResult {
	success: boolean;
	message: string;
	newDocumentName?: string;
	outputData?: unknown;
}

export abstract class BaseRestorationStrategy {
	abstract readonly name: string;
	abstract readonly description: string;
	abstract readonly isDestructive: boolean;

	constructor(protected readonly storageService: StorageService) {}

	abstract execute(context: RestorationContext): Promise<RestorationResult>;

	protected createYDocFromUpdates(updates: Uint8Array[]): Y.Doc {
		const ydoc = new Y.Doc();

		for (const update of updates) {
			Y.applyUpdate(ydoc, update);
		}

		return ydoc;
	}

	protected formatTimestamp(date: Date, useLocalTimezone: boolean = false): string {
		if (useLocalTimezone) {
			return date.toLocaleString();
		} else {
			return date
				.toISOString()
				.replace('T', ' ')
				.replace(/\.\d{3}Z$/, ' UTC');
		}
	}
}
