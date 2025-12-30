import { Inject, Injectable } from '@nestjs/common';
import { Client } from '@notionhq/client';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { LookupService } from './lookup.service.ts';
import { NotionClient } from '../tokens.ts';

const NOTION_TYPE_MAP: Record<string, string> = {
	title: 'string',
	rich_text: 'string',
	number: 'number',
	checkbox: 'boolean',
	select: 'string | null',
	multi_select: 'string[]',
	date: 'string | null',
	url: 'string | null',
	email: 'string | null',
	phone_number: 'string | null',
	files: 'string[]',
	people: 'string[]',
	status: 'string | null',
	relation: 'string[]',
	formula: 'unknown',
	rollup: 'unknown',
	created_time: 'string',
	last_edited_time: 'string',
	created_by: 'string',
	last_edited_by: 'string',
};

const OUTPUT_PATH = path.join(
	import.meta.dirname ?? '.',
	'..',
	'generated',
	'notion-types.ts',
);

export type DatabaseName = keyof LookupService['ids'];

export interface SchemaProperty {
	name: string;
	type: string;
	details: string;
}

export interface DatabaseSchema {
	name: string;
	id: string;
	properties: SchemaProperty[];
}

@Injectable()
export class SchemaService {
	constructor(
		@Inject(NotionClient) private readonly client: Client,
		private readonly lookup: LookupService,
	) {}

	get databases(): DatabaseName[] {
		return Object.keys(this.lookup.ids) as DatabaseName[];
	}

	async getSchema(dbName: DatabaseName): Promise<DatabaseSchema> {
		const dbId = this.lookup.getId(dbName);
		const database = await this.client.databases.retrieve({
			database_id: dbId,
		});

		const properties: SchemaProperty[] = [];

		for (const [name, property] of Object.entries(database.properties)) {
			const type = property.type;
			let details = '';

			if (type === 'relation') {
				const rel = property as any;
				details = `→ ${rel.relation?.database_id ?? 'unknown'}`;
			} else if (type === 'select' || type === 'multi_select') {
				const sel = property as any;
				const options = sel[type]?.options
					?.map((o: any) => o.name)
					.slice(0, 5);

				if (options?.length) {
					details = `[${options.join(', ')}${
						sel[type]?.options?.length > 5 ? '...' : ''
					}]`;
				}
			}

			properties.push({ name, type, details });
		}

		return {
			name: dbName,
			id: dbId,
			properties,
		};
	}

	private notionTypeToTs(notionType: string): string {
		return NOTION_TYPE_MAP[notionType] ?? 'unknown';
	}

	private formatPropertyName(name: string): string {
		// Convert to camelCase, removing special characters
		return name
			.split(/[\s_\-&]+/)
			.filter((word) => word.length > 0)
			.map((word, index) => {
				const lower = word.toLowerCase();
				return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
			})
			.join('');
	}

	async generateTypes(): Promise<string> {
		const lines: string[] = [
			'// Auto-generated from Notion database schemas',
			'// Do not edit manually',
			'',
		];

		for (const dbName of this.databases) {
			const schema = await this.getSchema(dbName);

			lines.push(`export interface ${dbName} {`);

			for (const prop of schema.properties) {
				const propName = this.formatPropertyName(prop.name);
				const tsType = this.notionTypeToTs(prop.type);
				lines.push(`\t${propName}: ${tsType};`);
			}

			lines.push('}');
			lines.push('');
		}

		return lines.join('\n');
	}

	async saveTypes(): Promise<string> {
		const content = await this.generateTypes();

		// Ensure directory exists
		const dir = path.dirname(OUTPUT_PATH);
		await fs.mkdir(dir, { recursive: true });

		await fs.writeFile(OUTPUT_PATH, content, 'utf-8');

		return OUTPUT_PATH;
	}
}
