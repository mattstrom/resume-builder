import { Adapter, type DatabasePropertyConfigResponse } from './adapter.ts';

export type PeopleProperty = Extract<
	DatabasePropertyConfigResponse,
	{ type: 'people' }
>;

export interface Person {
	id: string;
	name?: string;
	avatar_url?: string;
	type?: 'person' | 'bot';
	person?: {
		email?: string;
	};
}

export class PeopleAdapter extends Adapter<PeopleProperty, Person[]> {
	constructor(private readonly property: PeopleProperty) {
		super();
	}

	get(): Person[] {
		return (this.property.people as any) ?? [];
	}

	static is(
		property: DatabasePropertyConfigResponse,
	): property is PeopleProperty {
		return property.type === 'people';
	}
}
