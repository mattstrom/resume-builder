interface FileSystemHandlePermissionDescriptor {
	mode?: 'read' | 'readwrite';
}

interface FileSystemDirectoryHandle {
	readonly kind: 'directory';
	readonly name: string;
	getFileHandle(
		name: string,
		options?: { create?: boolean },
	): Promise<FileSystemFileHandle>;
	getDirectoryHandle(
		name: string,
		options?: { create?: boolean },
	): Promise<FileSystemDirectoryHandle>;
	removeEntry(
		name: string,
		options?: { recursive?: boolean },
	): Promise<void>;
	resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>;
	keys(): AsyncIterableIterator<string>;
	values(): AsyncIterableIterator<
		FileSystemFileHandle | FileSystemDirectoryHandle
	>;
	entries(): AsyncIterableIterator<
		[string, FileSystemFileHandle | FileSystemDirectoryHandle]
	>;
	queryPermission(
		descriptor?: FileSystemHandlePermissionDescriptor,
	): Promise<PermissionState>;
	requestPermission(
		descriptor?: FileSystemHandlePermissionDescriptor,
	): Promise<PermissionState>;
}

interface FileSystemFileHandle {
	readonly kind: 'file';
	readonly name: string;
	getFile(): Promise<File>;
	createWritable(options?: {
		keepExistingData?: boolean;
	}): Promise<FileSystemWritableFileStream>;
	queryPermission(
		descriptor?: FileSystemHandlePermissionDescriptor,
	): Promise<PermissionState>;
	requestPermission(
		descriptor?: FileSystemHandlePermissionDescriptor,
	): Promise<PermissionState>;
}

interface ShowDirectoryPickerOptions {
	id?: string;
	mode?: 'read' | 'readwrite';
	startIn?:
		| 'desktop'
		| 'documents'
		| 'downloads'
		| 'music'
		| 'pictures'
		| 'videos'
		| FileSystemHandle;
}

interface Window {
	showDirectoryPicker(
		options?: ShowDirectoryPickerOptions,
	): Promise<FileSystemDirectoryHandle>;
	showOpenFilePicker(options?: unknown): Promise<FileSystemFileHandle[]>;
	showSaveFilePicker(options?: unknown): Promise<FileSystemFileHandle>;
}
