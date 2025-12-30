import { Adapter, type DatabasePropertyConfigResponse } from './adapter.ts';

export type DateProperty = Extract<
	DatabasePropertyConfigResponse,
	{ type: 'date' }
>;

export interface DateRange {
	start: string;
	end: string | null;
	time_zone: string | null;
}

export class DateAdapter extends Adapter<DateProperty, DateRange | null> {
	constructor(private readonly property: DateProperty) {
		super();
	}

	get(): DateRange | null {
		return (this.property.date as any) ?? null;
	}

	static is(
		property: DatabasePropertyConfigResponse,
	): property is DateProperty {
		return property.type === 'date';
	}
}
