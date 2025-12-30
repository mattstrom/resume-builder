import { Adapter, type DatabasePropertyConfigResponse } from './adapter.ts';

export type FilesProperty = Extract<
	DatabasePropertyConfigResponse,
	{ type: 'files' }
>;

export interface FileObject {
	name: string;
	type?: 'external' | 'file';
	external?: {
		url: string;
	};
	file?: {
		url: string;
		expiry_time: string;
	};
}

export class FilesAdapter extends Adapter<FilesProperty, FileObject[]> {
	constructor(private readonly property: FilesProperty) {
		super();
	}

	get(): FileObject[] {
		return (this.property.files as any) ?? [];
	}

	static is(
		property: DatabasePropertyConfigResponse,
	): property is FilesProperty {
		return property.type === 'files';
	}
}
