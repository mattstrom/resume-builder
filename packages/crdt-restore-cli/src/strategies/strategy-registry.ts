import { StorageService } from '../storage/storage-service';
import { BaseRestorationStrategy } from './base-strategy';
import { NewDocumentStrategy } from './new-document-strategy';
import { ViewStrategy } from './view-strategy';

export type StrategyType = 'view' | 'new-document';

/** Replaces the NestJS `StrategyService` — same lookup API, plain constructor instead of DI. */
export class StrategyRegistry {
	private readonly strategies: Map<StrategyType, BaseRestorationStrategy>;

	constructor(storageService: StorageService) {
		this.strategies = new Map<StrategyType, BaseRestorationStrategy>([
			['view', new ViewStrategy(storageService)],
			['new-document', new NewDocumentStrategy(storageService)],
		]);
	}

	getStrategy(type: StrategyType): BaseRestorationStrategy {
		const strategy = this.strategies.get(type);

		if (!strategy) {
			throw new Error(`Unknown strategy type: ${type}`);
		}

		return strategy;
	}

	getAllStrategies(): Array<{ type: StrategyType; strategy: BaseRestorationStrategy }> {
		return Array.from(this.strategies.entries()).map(([type, strategy]) => ({
			type,
			strategy,
		}));
	}
}
