export async function requestDirectoryAccess(): Promise<
	FileSystemDirectoryHandle
> {
	return await window.showDirectoryPicker({
		mode: 'read',
		startIn: 'documents',
	});
}

export async function getJsonFiles(
	handle: FileSystemDirectoryHandle,
): Promise<string[]> {
	const files: string[] = [];
	for await (const entry of handle.values()) {
		if (entry.kind === 'file' && entry.name.endsWith('.json')) {
			files.push(entry.name);
		}
	}
	return files.sort();
}

export async function readJsonFile<T>(
	directoryHandle: FileSystemDirectoryHandle,
	fileName: string,
): Promise<T> {
	const fileHandle = await directoryHandle.getFileHandle(fileName);
	const file = await fileHandle.getFile();
	const text = await file.text();
	return JSON.parse(text);
}

export async function verifyPermission(
	handle: FileSystemDirectoryHandle,
): Promise<boolean> {
	const options = { mode: 'read' as const };
	if ((await handle.queryPermission(options)) === 'granted') {
		return true;
	}
	if ((await handle.requestPermission(options)) === 'granted') {
		return true;
	}
	return false;
}
