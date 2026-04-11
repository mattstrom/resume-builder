import {
	type FC,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import Editor, { type Monaco } from '@monaco-editor/react';
import { useMutation } from '@apollo/client/react';
import { observer } from 'mobx-react';
import { useStore } from '../../stores/store.provider.tsx';
import { useFileManager } from '../FileManager';
import { validateResume } from '../../utils/resumeValidation';
import resumeSchema from '@resume-builder/entities/schemas/resume.schema.json';
import type { Resume } from '@resume-builder/entities';
import { CREATE_RESUME, UPDATE_RESUME } from '../../graphql/mutations';
import { LIST_RESUMES } from '../../graphql/queries';
import type {
	CreateResumeData,
	CreateResumeVariables,
	UpdateResumeData,
	UpdateResumeVariables,
} from '../../graphql/types';

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number,
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout>;
	return (...args: Parameters<T>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const JsonEditor: FC = observer(() => {
	const { themeStore } = useStore();
	const { resumeData, updateResumeData } = useFileManager();
	const [jsonString, setJsonString] = useState<string>('');
	const [validationErrors, setValidationErrors] = useState<string[]>([]);
	// @ts-expect-error - Reserved for future use
	const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
	const isInternalUpdate = useRef(false);
	const lastResumeData = useRef<Resume | null>(null);
	const hasInitialized = useRef(false);
	// @ts-expect-error - Reserved for future use
	const autoSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isDirty = useRef(false); // Track if user has made unsaved changes
	// @ts-expect-error - Reserved for future use
	const isSaving = useRef(false); // Track if currently saving

	// @ts-expect-error - Mutations prepared for future use
	const [createResumeMutation] = useMutation<
		CreateResumeData,
		CreateResumeVariables
	>(CREATE_RESUME, {
		refetchQueries: [{ query: LIST_RESUMES }],
	});
	// @ts-expect-error - Mutations prepared for future use
	const [updateResumeMutation] = useMutation<
		UpdateResumeData,
		UpdateResumeVariables
	>(UPDATE_RESUME, {
		refetchQueries: [{ query: LIST_RESUMES }],
	});

	// Sync resumeData to jsonString when it changes externally (not from editor)
	useEffect(() => {
		// Only update if this is an external change (not from our editor)
		if (resumeData && !isInternalUpdate.current) {
			// Check if resumeData actually changed by comparing with last known value
			if (resumeData !== lastResumeData.current) {
				const newJsonString = JSON.stringify(resumeData, null, 2);
				setJsonString(newJsonString);
				lastResumeData.current = resumeData;
			}
		}
		isInternalUpdate.current = false;

		// Mark as initialized after first load
		if (!hasInitialized.current && resumeData) {
			hasInitialized.current = true;
		}
	}, [resumeData]);

	// Auto-save disabled - use SaveButton to manually save
	// useEffect(() => {
	// 	// Don't auto-save if:
	// 	// - Not initialized yet
	// 	// - No data
	// 	// - Has validation errors
	// 	// - Not dirty (no unsaved changes)
	// 	// - Currently saving
	// 	if (
	// 		!hasInitialized.current ||
	// 		!resumeData ||
	// 		validationErrors.length > 0 ||
	// 		!isDirty.current ||
	// 		isSaving.current
	// 	) {
	// 		return;
	// 	}

	// 	// Clear any pending auto-save
	// 	if (autoSaveTimeout.current) {
	// 		clearTimeout(autoSaveTimeout.current);
	// 	}

	// 	// Set up auto-save after 2 seconds
	// 	autoSaveTimeout.current = setTimeout(async () => {
	// 		if (!isDirty.current || isSaving.current) {
	// 			return; // Double-check before saving
	// 		}

	// 		try {
	// 			isSaving.current = true;
	// 			setSaveStatus('saving');
	// 			console.log('💾 Auto-saving...');

	// 			const hasMongoId = '_id' in resumeData && resumeData._id;
	// 			let savedResume;

	// 			if (hasMongoId) {
	// 				const { _id, ...resumeDataWithoutId } = resumeData;
	// 				const result = await updateResumeMutation({
	// 					variables: {
	// 						id: _id as string,
	// 						resumeData: resumeDataWithoutId,
	// 					},
	// 				});
	// 				savedResume = result.data?.updateResume;
	// 			} else {
	// 				const { _id, ...resumeDataWithoutId } = resumeData;
	// 				const result = await createResumeMutation({
	// 					variables: {
	// 						resumeData: resumeDataWithoutId,
	// 					},
	// 				});
	// 				savedResume = result.data?.createResume;
	// 			}

	// 			console.log('✓ Auto-save successful');
	// 			isDirty.current = false; // Clear dirty flag after successful save
	// 			isInternalUpdate.current = true; // Mark this as internal update
	// 			if (savedResume) {
	// 				updateResumeData(savedResume);
	// 			}
	// 			setSaveStatus('saved');

	// 			// Clear saved status after 2 seconds
	// 			setTimeout(() => {
	// 				setSaveStatus('idle');
	// 			}, 2000);
	// 		} catch (error) {
	// 			console.error('✗ Auto-save failed:', error);
	// 			setSaveStatus('error');

	// 			// Clear error status after 3 seconds
	// 			setTimeout(() => {
	// 				setSaveStatus('idle');
	// 			}, 3000);
	// 		} finally {
	// 			isSaving.current = false;
	// 		}
	// 	}, 2000);

	// 	// Cleanup
	// 	return () => {
	// 		if (autoSaveTimeout.current) {
	// 			clearTimeout(autoSaveTimeout.current);
	// 		}
	// 	};
	// }, [resumeData, validationErrors, updateResumeData, createResumeMutation, updateResumeMutation]);

	// Configure Monaco JSON validation with schema
	const handleEditorWillMount = useCallback((monaco: Monaco) => {
		monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
			validate: true,
			schemas: [
				{
					uri: 'http://resume-builder/resume.schema.json',
					fileMatch: ['*'],
					schema: resumeSchema,
				},
			],
		});
	}, []);

	// Debounced update handler
	const debouncedUpdate = useMemo(
		() =>
			debounce((jsonStr: string) => {
				try {
					const parsed = JSON.parse(jsonStr);
					const validation = validateResume(parsed);

					if (validation.valid) {
						console.log(
							'✓ Validation passed, updating resume data',
						);
						isInternalUpdate.current = true;
						isDirty.current = true; // Mark as dirty when user makes valid changes
						updateResumeData(parsed as Resume);
						setValidationErrors([]);
					} else {
						console.warn('✗ Validation failed:', validation.errors);
						setValidationErrors(validation.errors);
					}
				} catch (error) {
					if (error instanceof Error) {
						console.error('✗ JSON Parse Error:', error.message);
						setValidationErrors([
							`JSON Parse Error: ${error.message}`,
						]);
					} else {
						setValidationErrors(['Failed to parse JSON']);
					}
				}
			}, 500),
		[updateResumeData],
	);

	const handleEditorChange = useCallback(
		(value: string | undefined) => {
			const newValue = value ?? '';
			setJsonString(newValue);
			debouncedUpdate(newValue);
		},
		[debouncedUpdate],
	);

	return (
		<div className="flex flex-col h-full">
			<div className="flex-1 overflow-hidden">
				<Editor
					height="100%"
					defaultLanguage="json"
					theme={
						themeStore.resolvedTheme === 'dark' ? 'vs-dark' : 'vs'
					}
					value={jsonString}
					onChange={handleEditorChange}
					options={{
						minimap: { enabled: false },
						formatOnPaste: true,
						formatOnType: false,
						scrollBeyondLastLine: false,
						automaticLayout: true,
						tabSize: 2,
					}}
					beforeMount={handleEditorWillMount}
				/>
			</div>
			{validationErrors.length > 0 && (
				<div className="p-2 bg-destructive text-destructive-foreground text-xs max-h-[100px] overflow-auto">
					<strong>Validation Errors:</strong>
					<ul className="my-1 pl-5">
						{validationErrors.map((error, idx) => (
							<li key={idx}>{error}</li>
						))}
					</ul>
				</div>
			)}
			{saveStatus !== 'idle' && (
				<div
					className={`px-2 py-1 text-[11px] text-center ${
						saveStatus === 'saving'
							? 'bg-info text-info-foreground'
							: saveStatus === 'saved'
								? 'bg-success text-success-foreground'
								: 'bg-destructive text-destructive-foreground'
					}`}
				>
					{saveStatus === 'saving' && '💾 Auto-saving...'}
					{saveStatus === 'saved' && '✓ Saved'}
					{saveStatus === 'error' && '✗ Auto-save failed'}
				</div>
			)}
		</div>
	);
});
