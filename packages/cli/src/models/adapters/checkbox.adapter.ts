import { Adapter, type DatabasePropertyConfigResponse } from './adapter.ts';

export type CheckboxProperty = Extract<
  DatabasePropertyConfigResponse,
  { type: 'checkbox' }
>;

export class CheckboxAdapter extends Adapter<CheckboxProperty, boolean> {
  constructor(private readonly property: CheckboxProperty) {
    super();
  }

  get(): boolean {
    return (this.property.checkbox as any) ?? false;
  }

  static is(
    property: DatabasePropertyConfigResponse,
  ): property is CheckboxProperty {
    return property.type === 'checkbox';
  }
}