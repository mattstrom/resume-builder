import { Adapter, type DatabasePropertyConfigResponse } from './adapter.ts';

export type RichTextProperty = Extract<
	DatabasePropertyConfigResponse,
	{ type: 'rich_text' }
>;

export class RichTextAdapter extends Adapter<RichTextProperty, string> {
	constructor(private readonly property: RichTextProperty) {
		super();
	}

	get() {
		const elements = this.property.rich_text as any;
		return elements[0].plain_text;
	}

	static is(
		property: DatabasePropertyConfigResponse,
	): property is RichTextProperty {
		return property.type === 'number';
	}
}
