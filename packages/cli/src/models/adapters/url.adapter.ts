import { Adapter, type DatabasePropertyConfigResponse } from './adapter.ts';

export type UrlProperty = Extract<
	DatabasePropertyConfigResponse,
	{ type: 'url' }
>;

export class UrlAdapter extends Adapter<UrlProperty, string> {
	constructor(private readonly property: UrlProperty) {
		super();
	}

	get(): string {
		return (this.property.url as any) ?? '';
	}

	static is(
		property: DatabasePropertyConfigResponse,
	): property is UrlProperty {
		return property.type === 'url';
	}
}
