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
import { useNavigate } from '@tanstack/react-router';
import type { Resume } from '@resume-builder/entities';
import { useLazyQuery, useQuery } from '@apollo/client/react';
import {
	getJsonFiles,
	readJsonFile,
	requestDirectoryAccess,
	verifyPermission,
} from '../../utils/fileSystem';
import { validateResume } from '../../utils/resumeValidation';
import { GET_RESUME, LIST_RESUMES } from '../../graphql/queries';
import type {
	GetResumeData,
	GetResumeVariables,
	ListResumesData,
} from '../../graphql/types';

const STORAGE_KEY = 'resume:directoryHandle';

interface FileManagerState {
	directoryHandle: FileSystemDirectoryHandle | null;
	directoryName: string | null;
	files: string[];
	selectedFile: string | null;
	resumeData: Resume | null;
	apiResumes: Resume[];
	selectedApiResumeId: string | null;
	isLoading: boolean;
	error: string | null;
	isSupported: boolean;
}

interface FileManagerActions {
	attachDirectory: () => Promise<void>;
	detachDirectory: () => Promise<void>;
	selectFile: (fileName: string) => Promise<void>;
	refreshFiles: () => Promise<void>;
	loadApiResumes: () => Promise<void>;
	selectApiResume: (resumeId: string) => Promise<void>;
	updateResumeData: (resume: Resume) => void;
}

type FileManagerContextValue = FileManagerState & FileManagerActions;

const FileManagerContext = createContext<FileManagerContextValue | null>(null);

export const FileManagerProvider: FC<PropsWithChildren> = ({ children }) => {
	const navigate = useNavigate();
	const [directoryHandle, setDirectoryHandle] =
		useState<FileSystemDirectoryHandle | null>(null);
	const [files, setFiles] = useState<string[]>([]);
	const [selectedFile, setSelectedFile] = useState<string | null>(null);
	const [resumeData, setResumeData] = useState<Resume | null>(null);
	const [apiResumes, setApiResumes] = useState<Resume[]>([]);
	const [selectedApiResumeId, setSelectedApiResumeId] = useState<
		string | null
	>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isSupported = 'showDirectoryPicker' in window;

	// Apollo GraphQL hooks
	const {
		data: resumesData,
		loading: resumesLoading,
		error: resumesError,
		refetch: refetchResumes,
	} = useQuery<ListResumesData>(LIST_RESUMES, {
		fetchPolicy: 'network-only',
	});
	const [getResumeQuery, { loading: resumeLoading, error: resumeError }] =
		useLazyQuery<GetResumeData, GetResumeVariables>(GET_RESUME, {
			fetchPolicy: 'network-only',
		});

	const loadFile = useCallback(
		async (handle: FileSystemDirectoryHandle, fileName: string) => {
			setIsLoading(true);
			setError(null);

			try {
				const data = await readJsonFile<unknown>(handle, fileName);
				const validation = validateResume(data);

				if (!validation.valid) {
					setError(
						`Invalid resume format:\n${validation.errors.join(
							'\n',
						)}`,
					);
					return;
				}

				setResumeData(data as Resume);
				setSelectedFile(fileName);
				// Clear API selection when loading a file
				setSelectedApiResumeId(null);
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
				const handle =
					await get<FileSystemDirectoryHandle>(STORAGE_KEY);
				if (handle) {
					const hasPermission = await verifyPermission(handle);
					if (hasPermission) {
						setDirectoryHandle(handle);
						const jsonFiles = await getJsonFiles(handle);
						setFiles(jsonFiles);
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
			// Navigate to the local file route
			navigate({
				to: '/editor/local/$filename',
				params: { filename: fileName },
			});
		},
		[directoryHandle, loadFile, navigate],
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

	const loadApiResumes = useCallback(async () => {
		try {
			const result = await refetchResumes();
			const resumes = result.data?.listResumes || [];
			setApiResumes(resumes);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'Failed to load resumes from API',
			);
		}
	}, [refetchResumes]);

	const selectApiResume = useCallback(
		async (resumeId: string) => {
			setIsLoading(true);
			setError(null);

			// Set the selected ID immediately to prevent navigation loops
			setSelectedApiResumeId(resumeId);
			// Clear file selection when selecting API resume
			setSelectedFile(null);

			try {
				const result = await getResumeQuery({
					variables: { id: resumeId },
				});
				if (result.data?.getResume) {
					setResumeData(result.data.getResume);
				}
			} catch (err) {
				// Filter out abort errors - these are expected during navigation
				const isAbortError =
					err instanceof Error &&
					(err.name === 'AbortError' ||
						err.message.includes('aborted'));

				if (!isAbortError) {
					setError(
						err instanceof Error
							? err.message
							: 'Failed to load resume from API',
					);
					// Reset selection on error
					setSelectedApiResumeId(null);
				}
			} finally {
				setIsLoading(false);
			}
		},
		[getResumeQuery],
	);

	// Update API resumes when data changes
	useEffect(() => {
		if (resumesData?.listResumes) {
			setApiResumes(resumesData.listResumes);
		}
	}, [resumesData]);

	// Update loading and error state from Apollo queries
	useEffect(() => {
		setIsLoading(resumesLoading || resumeLoading);
	}, [resumesLoading, resumeLoading]);

	useEffect(() => {
		if (resumesError) {
			// Filter out abort errors from Apollo
			if (!resumesError.message.includes('aborted')) {
				setError(resumesError.message);
			}
		} else if (resumeError) {
			// Filter out abort errors from Apollo
			if (!resumeError.message.includes('aborted')) {
				setError(resumeError.message);
			}
		}
	}, [resumesError, resumeError]);

	const updateResumeData = useCallback((resume: Resume) => {
		setResumeData(resume);
	}, []);

	const value: FileManagerContextValue = {
		directoryHandle,
		directoryName: directoryHandle?.name ?? null,
		files,
		selectedFile,
		resumeData,
		apiResumes,
		selectedApiResumeId,
		isLoading,
		error,
		isSupported,
		attachDirectory,
		detachDirectory,
		selectFile,
		refreshFiles,
		loadApiResumes,
		selectApiResume,
		updateResumeData,
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
