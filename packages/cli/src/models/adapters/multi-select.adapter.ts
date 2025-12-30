import { Adapter, type DatabasePropertyConfigResponse } from './adapter.ts';

export type MultiSelectProperty = Extract<
  DatabasePropertyConfigResponse,
  { type: 'multi_select' }
>;

export interface MultiSelectOption {
  id: string;
  name: string;
  color: string;
}

export class MultiSelectAdapter extends Adapter<
  MultiSelectProperty,
  MultiSelectOption[]
> {
  constructor(private readonly property: MultiSelectProperty) {
    super();
  }

  get(): MultiSelectOption[] {
    return (this.property.multi_select?.options as MultiSelectOption[]) ?? [];
  }

  static is(
    property: DatabasePropertyConfigResponse,
  ): property is MultiSelectProperty {
    return property.type === 'multi_select';
  }
}