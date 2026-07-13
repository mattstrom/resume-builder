import { writeFileSync } from 'fs';

import { confirm, input, select } from '@inquirer/prompts';
import { Command, Option } from 'commander';

import { DocumentUpdateRecord, StorageService } from '../storage/storage-service';
import { BaseRestorationStrategy, RestorationContext } from '../strategies/base-strategy';
import { StrategyRegistry, StrategyType } from '../strategies/strategy-registry';
import { askIfUndefined } from '../utils/ask-if-undefined';

type RestorationStrategy = 'view' | 'new-document';

interface Options {
	name: string;
	uid: string;
	sequence?: number;
	timestamp?: number;
	output?: string;
	localTimezone?: boolean;
	strategy?: RestorationStrategy;
	confirm?: boolean;
}

export class RestoreCommand extends Command {
	private formatTimestamp(date: Date, useLocalTimezone: boolean = false): string {
		if (useLocalTimezone) {
			return date.toLocaleString();
		} else {
			return date
				.toISOString()
				.replace('T', ' ')
				.replace(/\.\d{3}Z$/, ' UTC');
		}
	}

	constructor(
		private readonly storageService: StorageService,
		private readonly strategyRegistry: StrategyRegistry,
	) {
		super('restore');

		this.summary('Restore a document using different strategies: view or create new document')
			.addOption(new Option('-n, --name <name>', 'Document name (e.g. "resume:<id>")'))
			.addOption(new Option('-U, --uid <uid>', 'Owning user ID'))
			.addOption(
				new Option('-u, --sequence <sequence>', 'Update sequence to restore to').argParser(
					parseInt,
				),
			)
			.addOption(
				new Option(
					'-t, --timestamp <timestamp>',
					'Timestamp to restore to (Unix timestamp)',
				).argParser(parseFloat),
			)
			.addOption(new Option('-o, --output <file>', 'Output to file instead of console'))
			.addOption(
				new Option(
					'--local-timezone',
					'Display timestamps in local timezone (default: UTC)',
				).default(false),
			)
			.addOption(
				new Option('-s, --strategy <strategy>', 'Restoration strategy').choices([
					'view',
					'new-document',
				]),
			)
			.addOption(
				new Option(
					'--confirm',
					'Skip confirmation prompts for destructive operations',
				).default(false),
			)
			.action(this.onAction);
	}

	private async onAction(opts: Options) {
		const name = await askIfUndefined(opts.name, () => input({ message: 'Document name:' }));
		const uid = await askIfUndefined(opts.uid, () => input({ message: 'Owning user ID:' }));

		console.log('Loading update history...');
		const items = await this.storageService.getItems(name, uid);

		if (!items || items.length === 0) {
			console.error(`Document "${name}" (uid "${uid}") not found or has no updates`);
			return;
		}

		const selectedSequence = await this.selectSequence(opts, items);

		if (selectedSequence === null) {
			return;
		}

		const strategy = await this.selectStrategy(opts);

		if (!strategy) {
			return;
		}

		if (strategy.isDestructive && !opts.confirm) {
			const confirmed = await this.confirmDestructiveOperation(
				strategy,
				name,
				selectedSequence,
			);
			if (!confirmed) {
				console.log('Operation cancelled.');
				return;
			}
		}

		const targetUpdates = items
			.filter((update) => update.sequence <= selectedSequence)
			.sort((a, b) => a.sequence - b.sequence);

		const context: RestorationContext = {
			name,
			uid,
			selectedSequence,
			allUpdates: items,
			targetUpdates,
			useLocalTimezone: opts.localTimezone || false,
		};

		console.log(`Executing ${strategy.name} strategy...`);
		const result = await strategy.execute(context);

		if (result.success) {
			console.log(`✅ ${result.message}`);

			if (result.newDocumentName) {
				console.log(`New document name: ${result.newDocumentName}`);
			}

			if (result.outputData && opts.output) {
				await this.writeOutput(result.outputData, opts);
			} else if (result.outputData && strategy.name === 'view') {
				console.log('Document state:');
				console.dir(result.outputData, { depth: null });
			}
		} else {
			console.error(`❌ ${result.message}`);
			process.exit(1);
		}
	}

	private async selectSequence(
		opts: Options,
		updateMetadata: DocumentUpdateRecord[],
	): Promise<number | null> {
		if (opts.sequence !== undefined) {
			return opts.sequence;
		}

		if (opts.timestamp !== undefined) {
			const targetTimestamp = opts.timestamp;
			const targetUpdate = updateMetadata
				.filter((update) => update.createdAt.getTime() / 1000 <= targetTimestamp)
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

			if (!targetUpdate) {
				console.error(`No updates found before timestamp ${opts.timestamp}`);
				return null;
			}

			const formattedTargetDate = this.formatTimestamp(
				targetUpdate.createdAt,
				opts.localTimezone,
			);
			console.log(
				`Selected update ${targetUpdate.sequence} (${formattedTargetDate} - closest to timestamp ${opts.timestamp})`,
			);
			return targetUpdate.sequence;
		}

		const choices = updateMetadata.map((update) => {
			const formattedDate = this.formatTimestamp(update.createdAt, opts.localTimezone);
			return {
				name: `Update ${update.sequence} - ${formattedDate}`,
				value: update.sequence,
				description: `Restore to update ${update.sequence} (${formattedDate})`,
			};
		});

		return select({
			message: 'Select an update to restore to:',
			choices,
			pageSize: 10,
		});
	}

	private async selectStrategy(opts: Options): Promise<BaseRestorationStrategy | null> {
		const strategyType = (opts.strategy as StrategyType) || 'view';

		if (opts.strategy) {
			return this.strategyRegistry.getStrategy(strategyType);
		}

		const strategies = this.strategyRegistry.getAllStrategies();
		const choices = strategies.map(({ type, strategy }) => ({
			name: `${type} - ${strategy.description}`,
			value: type,
			description: strategy.description,
		}));

		const selectedType = await select({
			message: 'Select restoration strategy:',
			choices,
			pageSize: 4,
		});

		return this.strategyRegistry.getStrategy(selectedType as StrategyType);
	}

	private async confirmDestructiveOperation(
		strategy: BaseRestorationStrategy,
		name: string,
		selectedSequence: number,
	): Promise<boolean> {
		console.log(`⚠️  Warning: The ${strategy.name} strategy is destructive!`);
		console.log(`   ${strategy.description}`);
		console.log(`   Document: ${name}`);
		console.log(`   Restore point: Update ${selectedSequence}`);
		console.log();

		return confirm({
			message: `Are you sure you want to proceed with the ${strategy.name} strategy?`,
			default: false,
		});
	}

	private async writeOutput(data: unknown, opts: Options): Promise<void> {
		const jsonString = JSON.stringify(data, null, 2);

		if (opts.output) {
			writeFileSync(opts.output, jsonString, 'utf8');
			console.log(`Output written to ${opts.output}`);
		}
	}
}
