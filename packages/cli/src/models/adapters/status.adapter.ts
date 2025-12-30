import { Adapter, type DatabasePropertyConfigResponse } from './adapter.ts';

export type StatusProperty = Extract<
	DatabasePropertyConfigResponse,
	{ type: 'status' }
>;

export interface StatusOption {
	id: string;
	name: string;
	color: string;
}

export interface StatusGroup {
	id: string;
	name: string;
	color: string;
	option_ids: string[];
}

export class StatusAdapter extends Adapter<StatusProperty, StatusOption[]> {
	constructor(private readonly property: StatusProperty) {
		super();
	}

	get(): StatusOption[] {
		return (this.property.status?.options as StatusOption[]) ?? [];
	}

	getGroups(): StatusGroup[] {
		return (this.property.status?.groups as StatusGroup[]) ?? [];
	}

	static is(
		property: DatabasePropertyConfigResponse,
	): property is StatusProperty {
		return property.type === 'status';
	}
}
