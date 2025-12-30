import { Adapter, type DatabasePropertyConfigResponse } from './adapter.ts';

export type SelectProperty = Extract<
  DatabasePropertyConfigResponse,
  { type: 'select' }
>;

export interface SelectOption {
  id: string;
  name: string;
  color: string;
}

export class SelectAdapter extends Adapter<SelectProperty, SelectOption[]> {
  constructor(private readonly property: SelectProperty) {
    super();
  }

  get(): SelectOption[] {
    return (this.property.select?.options as SelectOption[]) ?? [];
  }

  static is(
    property: DatabasePropertyConfigResponse,
  ): property is SelectProperty {
    return property.type === 'select';
  }
}