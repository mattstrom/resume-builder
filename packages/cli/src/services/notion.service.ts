import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
	type Client,
	isFullDatabase,
	iteratePaginatedAPI,
} from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';

import { NotionClient } from '../tokens.ts';
import { LookupService } from './lookup.service.ts';

type PropertyFilter = Parameters<Client['databases']['query']>[0]['filter'];

@Injectable()
export class NotionService {
	constructor(
		private readonly configService: ConfigService,
		private readonly lookup: LookupService,
		@Inject(NotionClient) private readonly client: Client,
	) {}

	async listDatabases() {
		const records = this.client.search({
			filter: {
				value: 'database',
				property: 'object',
			},
		});

		return records;
	}

	async findDatabase(query: string) {
		const response = await this.client.search({
			query: query,
			filter: {
				value: 'database',
				property: 'object',
			},
		});

		if (response.results.length === 0) {
			return null;
		}

		if (response.results.length > 1) {
			throw new Error(
				`Found multiple databases with name "${query}". Please be more specific.`,
			);
		}

		if (!isFullDatabase(response.results[0])) {
			throw new Error(
				`Found a non-database object with name "${query}". Please be more specific.`,
			);
		}

		return response.results[0];
	}

	getRecords(databaseId: string, filter: PropertyFilter) {
		return iteratePaginatedAPI(this.client.databases.query, {
			database_id: databaseId,
			filter,
		});
	}

	duplicate(databaseId: string, filter: PropertyFilter) {
		return iteratePaginatedAPI(this.client.databases.query, {
			database_id: databaseId,
			filter,
		});
	}

	async findResumeByName(name: string): Promise<PageObjectResponse> {
		const databaseId = this.lookup.getId('Resumes');
		const results = await this.client.databases.query({
			database_id: databaseId,
			filter: {
				property: 'Name',
				title: { equals: name },
			},
		});

		if (results.results.length === 0) {
			throw new Error(`Resume "${name}" not found`);
		}

		return results.results[0] as PageObjectResponse;
	}

	async findResumeById(id: string): Promise<PageObjectResponse> {
		// Normalize ID - add "RES-" prefix if not present
		const normalizedId = id.startsWith('RES-') ? id : `RES-${id}`;

		const databaseId = this.lookup.getId('Resumes');
		const results = await this.client.databases.query({
			database_id: databaseId,
			filter: {
				property: 'ID',
				unique_id: {
					equals: parseInt(normalizedId.replace('RES-', ''), 10),
				},
			},
		});

		if (results.results.length === 0) {
			throw new Error(`Resume with ID "${normalizedId}" not found`);
		}

		return results.results[0] as PageObjectResponse;
	}
}
