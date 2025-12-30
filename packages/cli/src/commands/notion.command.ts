import { Command } from '@cliffy/command';
import {
	Client,
	isFullPageOrDatabase,
	iteratePaginatedAPI,
} from '@notionhq/client';
import { DatabaseObjectResponse } from '@notionhq/client';
import { assert } from '@std/assert';

import { makeBuildCommand } from './subcommands/build.command.ts';

/**
 * Creates and returns a Command instance that includes a variety of commands
 * for interacting with the Notion API. This function is primarily intended for
 * managing and manipulating Notion pages and databases.
 *
 * @function
 *
 * @returns {Command} A Command object that includes subcommands for Notion operations.
 *
 * @example
 * The returned `Command` object provides the following commands:
 * - `notion add-gear`: A command to retrieve and process the 'Image' property of a specific Notion page.
 * - `notion sync-icons`: A command to set page icons in a database using the 'Image' property of records.
 * - Other commands such as `list-databases`, `find-database`, and more are also included.
 *
 * The main command also supports the following global environment variables and options:
 * - `NOTION_API_TOKEN`: Notion API token, required for authentication.
 * - `-d, --database-id`: Optionally specify a database ID for certain operations.
 */
export function makeNotionCommand(): Command {
	const pageId = '9dcc7a83f6ed452eb88b84f1b8eed052';

	return new Command()
		.name('resume-builder')
		.description('Notion commands')
		.globalEnv(
			'NOTION_API_TOKEN=<notionApiToken:string>',
			'Notion API token',
			{ required: true },
		)
		.globalOption('-d, --database-id <databaseId:string>', 'Database ID', {
			required: false,
		})
		.command('build', makeBuildCommand()) as any;
}

type DatabasePropertyConfigResponse =
	DatabaseObjectResponse['properties'][string];
type FilesDatabasePropertyConfigResponse = Extract<
	DatabasePropertyConfigResponse,
	{ type: 'files' }
>;

function isFilePropertyType(
	property: any,
): property is FilesDatabasePropertyConfigResponse {
	return property.type === 'files';
}

function isPropertyOfType<T>(name: string, type: any) {
	return (value: Record<string, any>): value is { [name: string]: T } => {
		return value[name].type === type;
	};
}
