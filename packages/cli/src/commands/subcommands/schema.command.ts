import { Command } from '@cliffy/command';
import { Select } from '@cliffy/prompt';
import { Table } from '@cliffy/table';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module.ts';
import { DatabaseName, SchemaService } from '../../services/schema.service.ts';

export class SchemaCommand extends Command {
	constructor() {
		super();

		this.name('schema')
			.description('Inspect the schema of a Notion database')
			.option('-d, --database <database>', 'The database to inspect', {
				required: false,
			})
			.option(
				'-g, --generate',
				'Generate TypeScript types for all databases',
			)
			.action(async (opts) => {
				const app = await NestFactory.createApplicationContext(
					AppModule.register({
						command: this,
					}),
				);

				const schemaService = app.get(SchemaService);

				if (opts.generate) {
					const outputPath = await schemaService.saveTypes();
					console.log(`TypeScript types generated at: ${outputPath}`);
					await app.close();
					return;
				}

				const databases = schemaService.databases;

				let dbName = opts.database;

				if (!dbName) {
					dbName = await Select.prompt({
						message: 'Which database?',
						options: databases,
					});
				}

				if (!databases.includes(dbName as DatabaseName)) {
					console.error(
						`Unknown database: ${dbName}. Available: ${databases.join(
							', ',
						)}`,
					);
					return;
				}

				const schema = await schemaService.getSchema(
					dbName as DatabaseName,
				);

				console.log(`\nDatabase: ${schema.name}`);
				console.log(`ID: ${schema.id}\n`);

				const rows = schema.properties.map((p) => [
					p.name,
					p.type,
					p.details,
				]);

				const table = new Table()
					.header(['Property', 'Type', 'Details'])
					.body(rows)
					.border(true);

				table.render();

				await app.close();
			});
	}
}
