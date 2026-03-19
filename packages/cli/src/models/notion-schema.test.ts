import { describe, it } from '@std/testing/bdd';
import { expect } from '@std/expect';
import { NotionSchema } from './notion-schema.ts';
import {
	Adapter,
	CheckboxAdapter,
	DateAdapter,
	EmailAdapter,
	FilesAdapter,
	MultiSelectAdapter,
	PeopleAdapter,
	RichTextAdapter,
	SelectAdapter,
	StatusAdapter,
	UrlAdapter,
} from './adapters/mod.ts';

describe('NotionSchema', () => {
	it('should', async () => {
		// Arrange

		// Act
		const record = new NotionSchema(data);

		// Assert
		expect(true).toBe(true);
	});

	const tests = [
		{
			name: 'Multi-select',
			type: MultiSelectAdapter,
			value: ['A', 'B', 'C'],
		},
		{ name: 'Email', type: EmailAdapter, value: 'me@example.com' },
		{ name: 'URL', type: UrlAdapter, value: 'https://example.com' },
		{ name: 'Checkbox', type: CheckboxAdapter, value: true },
		{ name: 'Text', type: RichTextAdapter, value: 'Text' },
		{ name: 'Status', type: StatusAdapter, value: 'Not started' },
		{ name: 'Date', type: DateAdapter, value: new Date('2025-12-29') },
		{ name: 'Select', type: SelectAdapter, value: 'A' },
		{ name: 'Files & media', type: FilesAdapter, value: [] },
		{ name: 'Person', type: PeopleAdapter, value: 'Alex Johnson' },
	] as const;

	for (const { name, type } of tests) {
		it(`should parse ${name} property into adapter of type ${type.constructor.name}`, async () => {
			// Act
			const record = new NotionSchema(data);

			// Assert
			const value = record[name];

			expect(record[name]).toBeInstanceOf(type);
			expect(true).toBe(true);
		});
	}
});

const data: any = {
	object: 'page',
	id: '2d9c4394-6e44-8046-92f1-ddcc0095b949',
	created_time: '2025-12-30T01:08:00.000Z',
	last_edited_time: '2025-12-30T01:10:00.000Z',
	created_by: {
		object: 'user',
		id: 'b91da67f-52a6-42d8-ad7c-466a784f8c05',
	},
	last_edited_by: {
		object: 'user',
		id: 'b91da67f-52a6-42d8-ad7c-466a784f8c05',
	},
	cover: null,
	icon: null,
	parent: {
		type: 'database_id',
		database_id: '2d9c4394-6e44-807f-85ca-e76ff6f557a1',
	},
	archived: false,
	in_trash: false,
	is_locked: false,
	properties: {
		'Multi-select': {
			id: '%40kuL',
			type: 'multi_select',
			multi_select: [
				{
					id: '26348c41-d316-4550-9214-91095f5b9fc9',
					name: 'A',
					color: 'green',
				},
				{
					id: '6512c4cd-4f4d-4ed4-b6f1-d17f42c094e2',
					name: 'B',
					color: 'yellow',
				},
				{
					id: '1325defb-7bd7-42dd-b4b1-bea56a2c1f3f',
					name: 'C',
					color: 'red',
				},
			],
		},
		Email: {
			id: 'C%40Cn',
			type: 'email',
			email: 'me@example.com',
		},
		URL: {
			id: 'GDlj',
			type: 'url',
			url: 'example.com',
		},
		Checkbox: {
			id: 'WRWp',
			type: 'checkbox',
			checkbox: true,
		},
		Text: {
			id: '%5Booc',
			type: 'rich_text',
			rich_text: [
				{
					type: 'text',
					text: {
						content: 'Text',
						link: null,
					},
					annotations: {
						bold: false,
						italic: false,
						strikethrough: false,
						underline: false,
						code: false,
						color: 'default',
					},
					plain_text: 'Text',
					href: null,
				},
			],
		},
		Status: {
			id: '%5Chjq',
			type: 'status',
			status: {
				id: 'ae39a557-2f1b-4fe4-b691-f96194601abb',
				name: 'Not started',
				color: 'default',
			},
		},
		Date: {
			id: 'hgVA',
			type: 'date',
			date: {
				start: '2025-12-29',
				end: null,
				time_zone: null,
			},
		},
		Select: {
			id: 'je%5D%40',
			type: 'select',
			select: {
				id: 'be653b31-8c62-46ea-a94e-7a1ee28a352d',
				name: 'A',
				color: 'pink',
			},
		},
		'Files & media': {
			id: 'rnhc',
			type: 'files',
			files: [
				{
					name: 'file.txt',
					type: 'file',
					file: {
						url: 'https://prod-files-secure.s3.us-west-2.amazonaws.com/example-workspace/example-file/file.txt',
						expiry_time: '2025-12-30T02:14:04.141Z',
					},
				},
			],
		},
		Person: {
			id: 'u%3Ctb',
			type: 'people',
			people: [
				{
					object: 'user',
					id: 'b91da67f-52a6-42d8-ad7c-466a784f8c05',
					name: 'Alex Johnson',
					avatar_url:
						'https://lh3.googleusercontent.com/a-/AOh14GiBd0FPwTt8YSbuDJPLpgxu-T4SUMV79iZ-XL_98IY=s100',
					type: 'person',
					person: {
						email: 'alex.johnson@example.com',
					},
				},
			],
		},
		Phone: {
			id: '%7BLJ%5E',
			type: 'phone_number',
			phone_number: '(800) 867-3509',
		},
		Number: {
			id: '%7Bk~h',
			type: 'number',
			number: 1,
		},
		Title: {
			id: 'title',
			type: 'title',
			title: [
				{
					type: 'text',
					text: {
						content: 'Title',
						link: null,
					},
					annotations: {
						bold: false,
						italic: false,
						strikethrough: false,
						underline: false,
						code: false,
						color: 'default',
					},
					plain_text: 'Title',
					href: null,
				},
			],
		},
	},
	url: 'https://www.notion.so/Title-2d9c43946e44804692f1ddcc0095b949',
	public_url: null,
};
