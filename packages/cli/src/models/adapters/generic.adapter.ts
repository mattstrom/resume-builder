import { Adapter, DatabasePropertyConfigResponse } from './adapter.ts';

export class GenericAdapter extends Adapter<
	DatabasePropertyConfigResponse,
	unknown
> {
	constructor(private readonly property: DatabasePropertyConfigResponse) {
		super();
	}

	get(): unknown {
		return this.property;
	}
}
