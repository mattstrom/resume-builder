import { Resolver, Tool } from '@nestjs-mcp/server';
import { outdent } from 'outdent';

import {
	lookupSchemaByName,
	SchemaNames,
	SchemaNamesEnum,
	SchemasAsJson,
} from '../entities';

@Resolver()
export class SchemasResolver {
	@Tool({
		name: 'get_schemas',
		description: 'Get all schemas',
		annotations: {
			destructureHint: false,
			idempotentHint: true,
		},
	})
	getSchemas() {
		const schemas = SchemasAsJson;

		return {
			content: [
				{
					type: 'text',
					text: outdent`
						Schemas by name:
						${JSON.stringify(schemas)}
					`,
				},
			],
			structuredContent: schemas,
		};
	}

	@Tool({
		name: 'get_schema_names',
		description: 'Get all schema names',
		annotations: {
			destructureHint: false,
			idempotentHint: true,
		},
	})
	getSchemaNames() {
		const schemaNames = SchemaNames;

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(schemaNames),
				},
			],
			structuredContent: schemaNames,
		};
	}

	@Tool({
		name: 'lookup_schema',
		description: 'Look up schema by name',
		paramsSchema: { name: SchemaNamesEnum },
		annotations: {
			destructureHint: false,
			idempotentHint: true,
		},
	})
	lookupSchema({ name }: { name: string }) {
		const schema = lookupSchemaByName(name);

		if (!schema) {
			throw new Error(`Schema with name '${name}' not found`);
		}

		return {
			content: [
				{
					type: 'text',
					text: outdent`
						Schema for ${name}:
						${JSON.stringify(schema)}
					`,
				},
			],
			structuredContent: schema,
		};
	}
}
