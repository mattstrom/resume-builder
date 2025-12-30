import { Adapter, type DatabasePropertyConfigResponse } from './adapter.ts';

export type PhoneNumberProperty = Extract<
  DatabasePropertyConfigResponse,
  { type: 'phone_number' }
>;

export class PhoneNumberAdapter extends Adapter<PhoneNumberProperty, string> {
  constructor(private readonly property: PhoneNumberProperty) {
    super();
  }

  get(): string {
    return (this.property.phone_number as any) ?? '';
  }

  static is(
    property: DatabasePropertyConfigResponse,
  ): property is PhoneNumberProperty {
    return property.type === 'phone_number';
  }
}