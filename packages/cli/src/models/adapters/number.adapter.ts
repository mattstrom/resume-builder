import { Adapter, type DatabasePropertyConfigResponse } from './adapter.ts';

export type NumberProperty = Extract<
	DatabasePropertyConfigResponse,
	{ type: 'number' }
>;

export class NumberAdapter extends Adapter<NumberProperty, number> {
	constructor(private readonly property: NumberProperty) {
		super();
	}

	get(): number {
		return 0;
	}

	static is(
		property: DatabasePropertyConfigResponse,
	): property is NumberProperty {
		return property.type === 'number';
	}
}
