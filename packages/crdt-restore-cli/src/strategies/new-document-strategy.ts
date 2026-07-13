import { v4 } from 'uuid';

import { DocumentUpdateRecord, StorageService } from '../storage/storage-service';
import { materializeDocument } from '../utils/materialize-document';
import { BaseRestorationStrategy, RestorationContext, RestorationResult } from './base-strategy';

export class NewDocumentStrategy extends BaseRestorationStrategy {
	readonly name = 'new-document';
	readonly description = 'Create a new document with state up to the selected restore point';
	readonly isDestructive = false;

	constructor(storageService: StorageService) {
		super(storageService);
	}

	async execute(context: RestorationContext): Promise<RestorationResult> {
		const { name, uid, selectedSequence, targetUpdates, useLocalTimezone } = context;

		try {
			const newDocumentName = deriveNewDocumentName(name);

			const targetUpdatesData = targetUpdates.map((item) => item.update);
			const restoredDoc = this.createYDocFromUpdates(targetUpdatesData);
			const jsonOutput = materializeDocument(restoredDoc, name);

			await this.createNewDocument(newDocumentName, uid, targetUpdates);

			const selectedUpdate = targetUpdates.find((u) => u.sequence === selectedSequence);
			const restorePointTime = selectedUpdate
				? this.formatTimestamp(selectedUpdate.createdAt, useLocalTimezone)
				: 'unknown time';

			return {
				success: true,
				message: `Created new document "${newDocumentName}" with state from update ${selectedSequence} (${restorePointTime}). Applied ${targetUpdates.length} updates.`,
				newDocumentName,
				outputData: jsonOutput,
			};
		} catch (error) {
			return {
				success: false,
				message: `Failed to create new document: ${error instanceof Error ? error.message : 'Unknown error'}`,
			};
		}
	}

	private async createNewDocument(
		newDocumentName: string,
		uid: string,
		updates: DocumentUpdateRecord[],
	): Promise<void> {
		await this.storageService.createNewDocument(newDocumentName, uid, updates);

		console.log(
			`✅ Created new document "${newDocumentName}" with ${updates.length} updates in Postgres`,
		);
		updates.forEach((update, index) => {
			console.log(
				`   Update ${index + 1}: ${update.update.byteLength} bytes (original sequence: ${update.sequence})`,
			);
		});
	}
}

/** Keeps the `resume:`/`profile:` prefix (if any) so the copy still parses as the same document kind. */
function deriveNewDocumentName(originalName: string): string {
	const separatorIndex = originalName.indexOf(':');

	if (separatorIndex === -1) {
		return v4();
	}

	return `${originalName.slice(0, separatorIndex + 1)}${v4()}`;
}
