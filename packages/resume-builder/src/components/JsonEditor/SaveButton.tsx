import { type FC, useCallback, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useMutation } from '@apollo/client/react';
import { useFileManager } from '../FileManager';
import { CREATE_RESUME, UPDATE_RESUME } from '../../graphql/mutations';
import { LIST_RESUMES } from '../../graphql/queries';
import type {
	CreateResumeData,
	CreateResumeVariables,
	UpdateResumeData,
	UpdateResumeVariables,
} from '../../graphql/types';
import { Button } from '@/components/ui/button';

type SaveState = 'idle' | 'saving' | 'success' | 'error';

interface SaveButtonProps {
	disabled?: boolean;
}

export const SaveButton: FC<SaveButtonProps> = ({ disabled = false }) => {
	const { resumeData, updateResumeData } = useFileManager();
	const [saveState, setSaveState] = useState<SaveState>('idle');
	const [errorMessage, setErrorMessage] = useState<string>('');

	const [createResumeMutation] = useMutation<CreateResumeData, CreateResumeVariables>(
		CREATE_RESUME,
		{
			refetchQueries: [{ query: LIST_RESUMES }],
		},
	);
	const [updateResumeMutation] = useMutation<UpdateResumeData, UpdateResumeVariables>(
		UPDATE_RESUME,
		{
			refetchQueries: [{ query: LIST_RESUMES }],
		},
	);

	const handleSave = useCallback(async () => {
		if (!resumeData) {
			setErrorMessage('No resume data to save');
			setSaveState('error');
			return;
		}

		console.log('💾 Saving resume data:', resumeData);

		setSaveState('saving');
		setErrorMessage('');

		try {
			// Check if resume has MongoDB _id (existing resume)
			const hasMongoId = '_id' in resumeData && resumeData._id;

			let savedResume;
			if (hasMongoId) {
				console.log('📝 Updating existing resume with _id:', resumeData._id);
				// Update existing resume
				const { _id, ...resumeDataWithoutId } = resumeData;
				const result = await updateResumeMutation({
					variables: {
						id: _id as string,
						resumeData: resumeDataWithoutId,
					},
				});
				savedResume = result.data?.updateResume;
			} else {
				console.log('➕ Creating new resume');
				// Create new resume
				const { _id, ...resumeDataWithoutId } = resumeData;
				const result = await createResumeMutation({
					variables: {
						resumeData: resumeDataWithoutId,
					},
				});
				savedResume = result.data?.createResume;
			}

			console.log('✓ Save successful:', savedResume);

			// Update FileManager with saved resume (includes _id for new resumes)
			if (savedResume) {
				updateResumeData(savedResume);
			}

			setSaveState('success');
			setTimeout(() => {
				setSaveState('idle');
			}, 2000);
		} catch (error) {
			console.error('✗ Save failed:', error);
			setSaveState('error');
			if (error instanceof Error) {
				setErrorMessage(error.message);
			} else {
				setErrorMessage('Failed to save resume');
			}
		}
	}, [resumeData, updateResumeData, createResumeMutation, updateResumeMutation]);

	const getButtonText = () => {
		switch (saveState) {
			case 'saving':
				return 'Saving...';
			case 'success':
				return 'Saved!';
			case 'error':
				return 'Save Failed';
			default:
				return 'Save to Backend';
		}
	};

	const getButtonVariant = () => {
		switch (saveState) {
			case 'error':
				return 'destructive' as const;
			default:
				return 'default' as const;
		}
	};

	const isDisabled = disabled || saveState === 'saving' || !resumeData;

	return (
		<div className="p-2">
			<Button
				variant={getButtonVariant()}
				onClick={handleSave}
				disabled={isDisabled}
				className={`w-full ${saveState === 'success' ? 'bg-green-600 hover:bg-green-700' : ''}`}
			>
				{saveState === 'saving' && (
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
				)}
				{getButtonText()}
			</Button>
			{saveState === 'error' && errorMessage && (
				<div className="mt-2 p-2 bg-red-50 text-red-800 text-xs rounded">
					{errorMessage}
				</div>
			)}
		</div>
	);
};
