import type { Command } from '@cliffy/command';
import { Inject, Injectable } from '@nestjs/common';
import { Client, iteratePaginatedAPI } from '@notionhq/client';

import { CommandToken, NotionClient } from '../tokens.ts';
import { LookupService } from './lookup.service.ts';

@Injectable()
export class BuildService {
	readonly resumesDb: string;

	constructor(
		private readonly lookup: LookupService,
		@Inject(CommandToken) private readonly command: Command,
		@Inject(NotionClient) private readonly client: Client,
	) {
		this.resumesDb = this.lookup.getId('Resumes');
	}

	listDev(): AsyncIterableIterator<any> {
		return iteratePaginatedAPI(this.client.databases.query, {
			database_id: this.lookup.getId('Dev'),
			filter: {
				and: [],
			},
		});
	}

	listResumes(): AsyncIterableIterator<any> {
		return iteratePaginatedAPI(this.client.databases.query, {
			database_id: this.resumesDb,
			filter: {
				and: [],
			},
		});
	}

	async findResume(name: string) {
		const results = await this.client.databases.query({
			database_id: this.resumesDb,
			filter: {
				and: [
					{
						property: 'Name',
						title: {
							equals: name,
						},
					},
				],
			},
		});

		return results.results[0];
	}
}
