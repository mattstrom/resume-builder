#!/usr/bin/env node
import { program } from 'commander';
import { Pool } from 'pg';

import { RestoreCommand } from './commands/restore-command';
import { UpdatesCommand } from './commands/updates-command';
import { StorageService } from './storage/storage-service';
import { StrategyRegistry } from './strategies/strategy-registry';

async function main() {
	const connectionString = process.env.DATABASE_URL;

	if (!connectionString) {
		console.error('Set DATABASE_URL to a Postgres connection string before running this CLI.');
		process.exit(1);
	}

	const pool = new Pool({ connectionString });
	const storageService = new StorageService(pool);
	const strategyRegistry = new StrategyRegistry(storageService);

	program
		.name('crdt-restore')
		.version('0.1.0')
		.summary('CLI tools for working with CRDTs')
		.addCommand(new UpdatesCommand(storageService))
		.addCommand(new RestoreCommand(storageService, strategyRegistry));

	try {
		await program.parseAsync();
	} finally {
		await pool.end();
	}
}

main();
