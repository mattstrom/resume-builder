import { type FC, useCallback, useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { useFileManager } from '../FileManager';
import { createResume, updateResume } from '../../utils/api';

type SaveState = 'idle' | 'saving' | 'success' | 'error';

interface SaveButtonProps {
	disabled?: boolean;
}

export const SaveButton: FC<SaveButtonProps> = ({ disabled = false }) => {
	const { resumeData, updateResumeData } = useFileManager();
	const [saveState, setSaveState] = useState<SaveState>('idle');
	const [errorMessage, setErrorMessage] = useState<string>('');

	const handleSave = useCallback(async () => {
		if (!resumeData) {
			setErrorMessage('No resume data to save');
			setSaveState('error');
			return;
		}

		setSaveState('saving');
		setErrorMessage('');

		try {
			// Check if resume has MongoDB _id (existing resume)
			const hasMongoId = '_id' in resumeData && resumeData._id;

			let savedResume;
			if (hasMongoId) {
				// Update existing resume
				savedResume = await updateResume(resumeData._id as string, resumeData);
			} else {
				// Create new resume
				savedResume = await createResume(resumeData);
			}

			// Update FileManager with saved resume (includes _id for new resumes)
			updateResumeData(savedResume);

			setSaveState('success');
			setTimeout(() => {
				setSaveState('idle');
			}, 2000);
		} catch (error) {
			setSaveState('error');
			if (error instanceof Error) {
				setErrorMessage(error.message);
			} else {
				setErrorMessage('Failed to save resume');
			}
		}
	}, [resumeData, updateResumeData]);

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

	const getButtonColor = () => {
		switch (saveState) {
			case 'success':
				return 'success';
			case 'error':
				return 'error';
			default:
				return 'primary';
		}
	};

	const isDisabled = disabled || saveState === 'saving' || !resumeData;

	return (
		<div style={{ padding: '8px' }}>
			<Button
				variant="contained"
				color={getButtonColor()}
				onClick={handleSave}
				disabled={isDisabled}
				startIcon={
					saveState === 'saving' ? (
						<CircularProgress size={16} color="inherit" />
					) : null
				}
				fullWidth
			>
				{getButtonText()}
			</Button>
			{saveState === 'error' && errorMessage && (
				<div
					style={{
						marginTop: '8px',
						padding: '8px',
						backgroundColor: '#ffebee',
						color: '#c62828',
						fontSize: '12px',
						borderRadius: '4px',
					}}
				>
					{errorMessage}
				</div>
			)}
		</div>
	);
};
