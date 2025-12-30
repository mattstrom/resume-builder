import { Adapter, type DatabasePropertyConfigResponse } from './adapter.ts';

export type EmailProperty = Extract<
	DatabasePropertyConfigResponse,
	{ type: 'email' }
>;

export class EmailAdapter extends Adapter<EmailProperty, string> {
	constructor(private readonly property: EmailProperty) {
		super();
	}

	get(): string {
		return (this.property.email as any) ?? '';
	}

	static is(
		property: DatabasePropertyConfigResponse,
	): property is EmailProperty {
		return property.type === 'email';
	}
}
