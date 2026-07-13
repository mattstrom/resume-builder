import { writeFileSync } from 'fs';

import { confirm, input } from '@inquirer/prompts';
import { Command, Option } from 'commander';
import * as Y from 'yjs';

import { StorageService } from '../storage/storage-service';
import { askIfUndefined } from '../utils/ask-if-undefined';
import { materializeDocument } from '../utils/materialize-document';

interface Options {
	name: string;
	uid: string;
	count?: number | '*';
	step: string;
	print?: boolean;
	output?: string;
	tail?: string;
}

export class UpdatesCommand extends Command {
	constructor(private readonly storageService: StorageService) {
		super('get-updates');

		this.summary('Retrieve updates for a document')
			.addOption(new Option('-n, --name <name>', 'Document name (e.g. "resume:<id>")'))
			.addOption(new Option('-U, --uid <uid>', 'Owning user ID'))
			.addOption(
				new Option(
					'-c, --count <count>',
					'Number of updates to apply or "*" for all',
				).argParser((value) => (value === '*' ? '*' : parseInt(value))),
			)
			.addOption(new Option('-o, --output <file>', 'Output to file instead of console'))
			.addOption(
				new Option('-p, --print', 'Print intermediate states to console').default(false),
			)
			.addOption(new Option('-s, --step', 'Step through updates one-by-one').default(false))
			.addOption(
				new Option(
					'-t, --tail <file>',
					'Output to timestamped file based on provided filename',
				),
			)
			.action(this.onAction);
	}

	private async onAction(opts: Options) {
		const name = await askIfUndefined(opts.name, () => input({ message: 'Document name:' }));
		const uid = await askIfUndefined(opts.uid, () => input({ message: 'Owning user ID:' }));
		const count = await askIfUndefined(
			opts.count,
			() => input({ message: 'Count (leave blank or "*" for all updates):' }),
			(value) =>
				value === '' || value === undefined
					? undefined
					: value === '*'
						? '*'
						: parseInt(value),
		);

		const items = await this.storageService.getItems(name, uid);
		const updates = items?.map((item) => item.update);

		if (!updates) {
			console.error(`Document "${name}" (uid "${uid}") not found`);
			return;
		}

		const iterator = materialize(updates, name, count, opts.print);
		let current = iterator.next();

		while (!current.done) {
			if (opts.step && !(await confirm({ message: 'Proceed?' }))) {
				process.exit(0);
			}

			current = iterator.next();
		}

		const ydoc = current.value;
		const jsonOutput = materializeDocument(ydoc, name);

		if (opts.tail) {
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
			const extension = opts.tail.includes('.') ? '' : '.json';
			const timestampedFilename =
				opts.tail.replace(/(\.[^.]+)?$/, `-${timestamp}$1`) + extension;
			const jsonString = JSON.stringify(jsonOutput, null, 2);

			writeFileSync(timestampedFilename, jsonString, 'utf8');

			console.log(`Output written to ${timestampedFilename}`);
		} else if (opts.output) {
			const jsonString = JSON.stringify(jsonOutput, null, 2);

			writeFileSync(opts.output, jsonString, 'utf8');

			console.log(`Output written to ${opts.output}`);
		} else if (!opts.print) {
			console.dir(jsonOutput, { depth: null });
		}
	}
}

/**
 * Returns a generator that iteratively applies updates to a Yjs document.
 * @param updates - Array of Uint8Array updates to apply.
 * @param documentName - Document name, used to pick the right materialized shape.
 * @param count - Optional number of updates to apply.
 * @param print - Optional flag to print intermediate states to console.
 */
function* materialize(
	updates: Uint8Array[],
	documentName: string,
	count?: number | '*',
	print?: boolean,
) {
	const ydoc = new Y.Doc();

	const end = count === undefined || count === '*' ? undefined : count;
	for (const [index, update] of updates.slice(0, end).entries()) {
		Y.applyUpdate(ydoc, update);

		if (print) {
			console.group(
				`[${index + 1} of ${updates.length}] ================================================================================`,
			);
			console.dir(materializeDocument(ydoc, documentName), { depth: 2 });

			console.groupEnd();
		}

		yield ydoc;
	}

	return ydoc;
}
