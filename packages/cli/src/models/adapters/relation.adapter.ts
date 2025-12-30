import { Adapter, type DatabasePropertyConfigResponse } from './adapter.ts';

export type RelationProperty = Extract<
	DatabasePropertyConfigResponse,
	{ type: 'relation' }
>;

export interface RelationReference {
	id: string;
}

export class RelationAdapter extends Adapter<
	RelationProperty,
	RelationReference[]
> {
	constructor(private readonly property: RelationProperty) {
		super();
	}

	get(): RelationReference[] {
		const relation = (this.property as any).relation;
		if (!relation || !Array.isArray(relation)) {
			return [];
		}
		return relation.map((r: any) => ({ id: r.id }));
	}

	getIds(): string[] {
		return this.get().map((r) => r.id);
	}

	static is(
		property: DatabasePropertyConfigResponse,
	): property is RelationProperty {
		return property.type === 'relation';
	}
}
