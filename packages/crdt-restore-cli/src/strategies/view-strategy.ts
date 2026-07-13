import { StorageService } from '../storage/storage-service';
import { materializeDocument } from '../utils/materialize-document';
import { BaseRestorationStrategy, RestorationContext, RestorationResult } from './base-strategy';

export class ViewStrategy extends BaseRestorationStrategy {
	readonly name = 'view';
	readonly description = 'View the document state at the selected point (read-only)';
	readonly isDestructive = false;

	constructor(storageService: StorageService) {
		super(storageService);
	}

	async execute(context: RestorationContext): Promise<RestorationResult> {
		const { name, targetUpdates, selectedSequence } = context;

		const updates = targetUpdates.map((u) => u.update);
		const ydoc = this.createYDocFromUpdates(updates);
		const jsonOutput = materializeDocument(ydoc, name);

		return {
			success: true,
			message: `Document state restored to update ${selectedSequence} (applied ${targetUpdates.length} updates)`,
			outputData: jsonOutput,
		};
	}
}
