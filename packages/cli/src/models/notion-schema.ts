import { DatabaseObjectResponse } from '@notionhq/client';
import {
	Adapter,
	CheckboxAdapter,
	DateAdapter,
	EmailAdapter,
	FilesAdapter,
	GenericAdapter,
	MultiSelectAdapter,
	NumberAdapter,
	PeopleAdapter,
	PhoneNumberAdapter,
	RelationAdapter,
	RichTextAdapter,
	SelectAdapter,
	StatusAdapter,
	TitleAdapter,
	UrlAdapter,
} from './adapters/mod.ts';

export class NotionSchema {
	[key: string]: unknown;

	private properties = new Map<string, Adapter>();

	constructor(public readonly raw: DatabaseObjectResponse) {
		// if (!isFullDatabase(raw)) {
		// 	throw new Error('Not a full page');
		// }

		for (const [name, property] of Object.entries(raw.properties)) {
			switch (property.type) {
				case 'title': {
					this.properties.set(name, new TitleAdapter(property));
					break;
				}
				case 'rich_text': {
					this.properties.set(name, new RichTextAdapter(property));
					break;
				}
				case 'number': {
					this.properties.set(name, new NumberAdapter(property));
					break;
				}
				case 'checkbox': {
					this.properties.set(name, new CheckboxAdapter(property));
					break;
				}
				case 'select': {
					this.properties.set(name, new SelectAdapter(property));
					break;
				}
				case 'multi_select': {
					this.properties.set(name, new MultiSelectAdapter(property));
					break;
				}
				case 'date': {
					this.properties.set(name, new DateAdapter(property));
					break;
				}
				case 'url': {
					this.properties.set(name, new UrlAdapter(property));
					break;
				}
				case 'email': {
					this.properties.set(name, new EmailAdapter(property));
					break;
				}
				case 'phone_number': {
					this.properties.set(name, new PhoneNumberAdapter(property));
					break;
				}
				case 'files': {
					this.properties.set(name, new FilesAdapter(property));
					break;
				}
				case 'people': {
					this.properties.set(name, new PeopleAdapter(property));
					break;
				}
				case 'status': {
					this.properties.set(name, new StatusAdapter(property));
					break;
				}
				case 'relation': {
					this.properties.set(name, new RelationAdapter(property));
					break;
				}
				default: {
					this.properties.set(name, new GenericAdapter(property));
					break;
				}
			}

			Object.defineProperty(this, name, {
				value: this.properties.get(name)!.get(),
			});
		}
	}
}
