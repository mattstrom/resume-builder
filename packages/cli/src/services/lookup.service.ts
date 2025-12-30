import { Inject, Injectable } from '@nestjs/common';
import { NotionClient } from '../tokens.ts';
import { Client } from '@notionhq/client';

type DbName = keyof LookupService['ids'];

@Injectable()
export class LookupService {
	readonly ids = {
		Dev: 'https://www.notion.so/placeholder/2d9c43946e44807f85cae76ff6f557a1?v=2d9c43946e44805781df000c494a061b',
		Education:
			'https://www.notion.so/placeholder/2d8c43946e4480f5b461fd4288597e3f?v=2d8c43946e4480e09ffd000c09f22b4f',
		Projects:
			'https://www.notion.so/placeholder/2d8c43946e4480b6a50cd8b94aa81e65?v=2d8c43946e4480b5a4e4000c3ad1f0d5',
		Resumes:
			'https://www.notion.so/placeholder/2d8c43946e44803ba48be46f1afd0633?v=2d8c43946e448075a4f7000c0d110cfd',
		Responsibilities:
			'https://www.notion.so/placeholder/2d8c43946e4480cb838cee31c612c327?v=2d8c43946e4480eab5ad000c5a4a3d83',
		Skills:
			'https://www.notion.so/placeholder/2d8c43946e44809c8c06f156a79c3e15?v=2d8c43946e448039986d000c23df679f',
		WorkHistory:
			'https://www.notion.so/placeholder/2d8c43946e4480788559ee7169fb0e52?v=2d8c43946e448075849e000c1fa71793',
	} as const;

	constructor(@Inject(NotionClient) private readonly client: Client) {}

	getId(name: DbName): string {
		const entry = this.ids[name];
		const url = new URL(entry);

		const parts = url.pathname.split('/');
		const id = parts.at(2);

		if (!id) {
			throw new Error(`Could not find ID for "${name}".`);
		}

		return id;
	}

	async getRecordByTitle(
		name: DbName,
		title: string,
		column: string = 'Title',
	) {
		const db = this.getId(name);

		const records = await this.client.databases.query({
			database_id: db,
			filter: {
				and: [
					{
						property: column,
						title: {
							equals: title,
						},
					},
				],
			},
		});

		if (records.results.length === 0) {
			return null;
		}

		return records.results[0];
	}
}
