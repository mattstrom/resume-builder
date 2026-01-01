import {
	createContext,
	type FC,
	type PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useState,
} from 'react';
import { del, get, set } from 'idb-keyval';
import type { Resume } from '../../types';
import {
	getJsonFiles,
	readJsonFile,
	requestDirectoryAccess,
	verifyPermission,
} from '../../utils/fileSystem';
import { validateResume } from '../../utils/resumeValidation';

const STORAGE_KEY = 'resume:directoryHandle';
const SELECTED_FILE_KEY = 'resume:selectedFile';

interface FileManagerState {
	directoryHandle: FileSystemDirectoryHandle | null;
	directoryName: string | null;
	files: string[];
	selectedFile: string | null;
	resumeData: Resume | null;
	isLoading: boolean;
	error: string | null;
	isSupported: boolean;
}

interface FileManagerActions {
	attachDirectory: () => Promise<void>;
	detachDirectory: () => Promise<void>;
	selectFile: (fileName: string) => Promise<void>;
	refreshFiles: () => Promise<void>;
}

type FileManagerContextValue = FileManagerState & FileManagerActions;

const FileManagerContext = createContext<FileManagerContextValue | null>(null);

export const FileManagerProvider: FC<PropsWithChildren> = ({ children }) => {
	const [directoryHandle, setDirectoryHandle] = useState<
		FileSystemDirectoryHandle | null
	>(null);
	const [files, setFiles] = useState<string[]>([]);
	const [selectedFile, setSelectedFile] = useState<string | null>(null);
	const [resumeData, setResumeData] = useState<Resume | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isSupported = 'showDirectoryPicker' in window;

	const loadFile = useCallback(
		async (handle: FileSystemDirectoryHandle, fileName: string) => {
			setIsLoading(true);
			setError(null);

			try {
				const data = await readJsonFile<unknown>(handle, fileName);
				const validation = validateResume(data);

				if (!validation.valid) {
					setError(
						`Invalid resume format:\n${
							validation.errors.join('\n')
						}`,
					);
					return;
				}

				setResumeData(data as Resume);
				setSelectedFile(fileName);
				localStorage.setItem(SELECTED_FILE_KEY, fileName);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : 'Failed to read file',
				);
			} finally {
				setIsLoading(false);
			}
		},
		[],
	);

	// Restore persisted directory handle on mount
	useEffect(() => {
		if (!isSupported) return;

		const restore = async () => {
			try {
				const handle = await get<FileSystemDirectoryHandle>(
					STORAGE_KEY,
				);
				if (handle) {
					const hasPermission = await verifyPermission(handle);
					if (hasPermission) {
						setDirectoryHandle(handle);
						const jsonFiles = await getJsonFiles(handle);
						setFiles(jsonFiles);

						// Restore selected file
						const savedFile = localStorage.getItem(
							SELECTED_FILE_KEY,
						);
						if (savedFile && jsonFiles.includes(savedFile)) {
							await loadFile(handle, savedFile);
						}
					} else {
						await del(STORAGE_KEY);
					}
				}
			} catch (err) {
				console.error('Failed to restore directory handle:', err);
			}
		};

		restore();
	}, [isSupported, loadFile]);

	const attachDirectory = useCallback(async () => {
		if (!isSupported) return;

		try {
			setError(null);
			const handle = await requestDirectoryAccess();
			setDirectoryHandle(handle);
			await set(STORAGE_KEY, handle);

			const jsonFiles = await getJsonFiles(handle);
			setFiles(jsonFiles);

			// Clear previous selection
			setSelectedFile(null);
			setResumeData(null);
			localStorage.removeItem(SELECTED_FILE_KEY);
		} catch (err) {
			if ((err as Error).name !== 'AbortError') {
				setError(
					err instanceof Error
						? err.message
						: 'Failed to access directory',
				);
			}
		}
	}, [isSupported]);

	const detachDirectory = useCallback(async () => {
		await del(STORAGE_KEY);
		localStorage.removeItem(SELECTED_FILE_KEY);
		setDirectoryHandle(null);
		setFiles([]);
		setSelectedFile(null);
		setResumeData(null);
		setError(null);
	}, []);

	const selectFile = useCallback(
		async (fileName: string) => {
			if (!directoryHandle) return;
			await loadFile(directoryHandle, fileName);
		},
		[directoryHandle, loadFile],
	);

	const refreshFiles = useCallback(async () => {
		if (!directoryHandle) return;

		try {
			const jsonFiles = await getJsonFiles(directoryHandle);
			setFiles(jsonFiles);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to refresh files',
			);
		}
	}, [directoryHandle]);

	const value: FileManagerContextValue = {
		directoryHandle,
		directoryName: directoryHandle?.name ?? null,
		files,
		selectedFile,
		resumeData,
		isLoading,
		error,
		isSupported,
		attachDirectory,
		detachDirectory,
		selectFile,
		refreshFiles,
	};

	return (
		<FileManagerContext.Provider value={value}>
			{children}
		</FileManagerContext.Provider>
	);
};

export function useFileManager() {
	const context = useContext(FileManagerContext);
	if (!context) {
		throw new Error(
			'useFileManager must be used within FileManagerProvider',
		);
	}
	return context;
}
