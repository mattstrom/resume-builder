import { Adapter, type DatabasePropertyConfigResponse } from './adapter.ts';

export type TitleProperty = Extract<
	DatabasePropertyConfigResponse,
	{ type: 'title' }
>;

export class TitleAdapter extends Adapter<TitleProperty, string> {
	constructor(private readonly property: TitleProperty) {
		super();
	}

	get(): string {
		const elements = this.property.title as any;
		if (!elements || elements.length === 0) {
			return '';
		}
		return elements.map((e: any) => e.plain_text).join('');
	}

	static is(
		property: DatabasePropertyConfigResponse,
	): property is TitleProperty {
		return property.type === 'title';
	}
}
