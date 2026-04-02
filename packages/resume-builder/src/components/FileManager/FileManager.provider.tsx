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
import type { Application, Resume } from '@resume-builder/entities';
import { useLazyQuery, useQuery } from '@apollo/client/react';
import {
	getJsonFiles,
	readJsonFile,
	requestDirectoryAccess,
	verifyPermission,
} from '../../utils/fileSystem';
import { validateResume } from '../../utils/resumeValidation';
import {
	GET_APPLICATION,
	GET_RESUME,
	LIST_APPLICATIONS,
} from '../../graphql/queries';
import type {
	GetApplicationData,
	GetApplicationVariables,
	GetResumeData,
	GetResumeVariables,
	ListApplicationsData,
} from '../../graphql/types';

const STORAGE_KEY = 'resume:directoryHandle';

interface FileManagerState {
	directoryHandle: FileSystemDirectoryHandle | null;
	directoryName: string | null;
	files: string[];
	selectedFile: string | null;
	resumeData: Resume | null;
	apiApplications: Application[];
	selectedApiApplicationId: string | null;
	selectedApplication: Application | null;
	isLoading: boolean;
	error: string | null;
	isSupported: boolean;
}

interface FileManagerActions {
	attachDirectory: () => Promise<void>;
	detachDirectory: () => Promise<void>;
	selectFile: (fileName: string) => Promise<void>;
	refreshFiles: () => Promise<void>;
	loadApiApplications: () => Promise<void>;
	selectApiApplication: (applicationId: string) => Promise<void>;
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
	const [apiApplications, setApiApplications] = useState<Application[]>([]);
	const [selectedApiApplicationId, setSelectedApiApplicationId] = useState<
		string | null
	>(null);
	const [selectedApplication, setSelectedApplication] =
		useState<Application | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isSupported = 'showDirectoryPicker' in window;

	// Apollo GraphQL hooks
	const {
		data: applicationsData,
		loading: applicationsLoading,
		error: applicationsError,
		refetch: refetchApplications,
	} = useQuery<ListApplicationsData>(LIST_APPLICATIONS, {
		fetchPolicy: 'network-only',
	});
	const [
		getApplicationQuery,
		{ loading: applicationLoading, error: applicationError },
	] = useLazyQuery<GetApplicationData, GetApplicationVariables>(
		GET_APPLICATION,
		{
			fetchPolicy: 'network-only',
		},
	);
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
				setSelectedApiApplicationId(null);
				setSelectedApplication(null);
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
			setSelectedApplication(null);
			setSelectedApiApplicationId(null);
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
		setSelectedApplication(null);
		setSelectedApiApplicationId(null);
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

	const loadApiApplications = useCallback(async () => {
		try {
			const result = await refetchApplications();
			const applications = result.data?.listApplications || [];
			setApiApplications(applications);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'Failed to load applications from API',
			);
		}
	}, [refetchApplications]);

	const selectApiApplication = useCallback(
		async (applicationId: string) => {
			setIsLoading(true);
			setError(null);

			setSelectedApiApplicationId(applicationId);
			setSelectedFile(null);

			try {
				const applicationResult = await getApplicationQuery({
					variables: { id: applicationId },
				});
				const application = applicationResult.data?.getApplication;

				if (!application) {
					throw new Error('Application not found');
				}

				setSelectedApplication(application);

				if (!application.resumeId) {
					setResumeData(null);
					return;
				}

				const resumeResult = await getResumeQuery({
					variables: { id: application.resumeId },
				});
				if (resumeResult.data?.getResume) {
					setResumeData(resumeResult.data.getResume);
				} else {
					setResumeData(null);
				}
			} catch (err) {
				const isAbortError =
					err instanceof Error &&
					(err.name === 'AbortError' ||
						err.message.includes('aborted'));

				if (!isAbortError) {
					setError(
						err instanceof Error
							? err.message
							: 'Failed to load application from API',
					);
					setSelectedApiApplicationId(null);
					setSelectedApplication(null);
				}
			} finally {
				setIsLoading(false);
			}
		},
		[getApplicationQuery, getResumeQuery],
	);

	useEffect(() => {
		if (applicationsData?.listApplications) {
			setApiApplications(applicationsData.listApplications);
		}
	}, [applicationsData]);

	useEffect(() => {
		setIsLoading(
			applicationsLoading || applicationLoading || resumeLoading,
		);
	}, [applicationsLoading, applicationLoading, resumeLoading]);

	useEffect(() => {
		if (applicationsError) {
			if (!applicationsError.message.includes('aborted')) {
				setError(applicationsError.message);
			}
		} else if (applicationError) {
			if (!applicationError.message.includes('aborted')) {
				setError(applicationError.message);
			}
		} else if (resumeError) {
			if (!resumeError.message.includes('aborted')) {
				setError(resumeError.message);
			}
		}
	}, [applicationsError, applicationError, resumeError]);

	const updateResumeData = useCallback((resume: Resume) => {
		setResumeData(resume);
	}, []);

	const value: FileManagerContextValue = {
		directoryHandle,
		directoryName: directoryHandle?.name ?? null,
		files,
		selectedFile,
		resumeData,
		apiApplications,
		selectedApiApplicationId,
		selectedApplication,
		isLoading,
		error,
		isSupported,
		attachDirectory,
		detachDirectory,
		selectFile,
		refreshFiles,
		loadApiApplications,
		selectApiApplication,
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
