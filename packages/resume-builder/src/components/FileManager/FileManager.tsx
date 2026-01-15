import { type FC } from 'react';
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	FormControl,
	IconButton,
	InputLabel,
	MenuItem,
	Select,
	Typography,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import { useFileManager } from './FileManager.provider';

export const FileManager: FC = () => {
	const {
		directoryName,
		files,
		selectedFile,
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
	} = useFileManager();

	if (!isSupported) {
		return (
			<Alert severity='warning' sx={{ mb: 2 }}>
				File System Access API is not supported in this browser.
			</Alert>
		);
	}

	return (
		<Box sx={{ mb: 2 }}>
			{/* API Resumes Section */}
			<Typography variant='subtitle2' gutterBottom>
				Backend Resumes
			</Typography>

			{apiResumes.length > 0 && (
				<FormControl fullWidth size='small' sx={{ mb: 2 }}>
					<InputLabel>Select Resume</InputLabel>
					<Select
						value={selectedApiResumeId ?? ''}
						label='Select Resume'
						onChange={(e) =>
							selectApiResume(e.target.value)}
						disabled={isLoading}
					>
						{apiResumes.map((resume) => (
							<MenuItem key={resume._id} value={resume._id}>
								{resume.name}
							</MenuItem>
						))}
					</Select>
				</FormControl>
			)}

			{apiResumes.length === 0 && !isLoading && (
				<Box sx={{ mb: 2 }}>
					<Typography
						variant='body2'
						color='text.secondary'
						gutterBottom
					>
						No resumes available from backend
					</Typography>
					<Button
						variant='text'
						size='small'
						onClick={loadApiResumes}
						startIcon={<RefreshIcon />}
					>
						Retry
					</Button>
				</Box>
			)}

			{/* Local Files Section */}
			<Typography variant='subtitle2' gutterBottom sx={{ mt: 2 }}>
				Local Resume File
			</Typography>

			{!directoryName
				? (
					<Button
						variant='outlined'
						startIcon={<FolderOpenIcon />}
						onClick={attachDirectory}
						fullWidth
					>
						Attach Directory
					</Button>
				)
				: (
					<>
						<Box
							sx={{
								display: 'flex',
								alignItems: 'center',
								gap: 1,
								mb: 1,
							}}
						>
							<FolderOpenIcon fontSize='small' />
							<Typography variant='body2' sx={{ flex: 1 }}>
								{directoryName}
							</Typography>
							<IconButton
								size='small'
								onClick={refreshFiles}
								title='Refresh'
							>
								<RefreshIcon fontSize='small' />
							</IconButton>
							<IconButton
								size='small'
								onClick={detachDirectory}
								title='Detach'
							>
								<CloseIcon fontSize='small' />
							</IconButton>
						</Box>

						{files.length === 0
							? (
								<Typography
									variant='body2'
									color='text.secondary'
								>
									No JSON files found
								</Typography>
							)
							: (
								<FormControl fullWidth size='small'>
									<InputLabel>Select File</InputLabel>
									<Select
										value={selectedFile ?? ''}
										label='Select File'
										onChange={(e) =>
											selectFile(e.target.value)}
										disabled={isLoading}
									>
										{files.map((file) => (
											<MenuItem key={file} value={file}>
												{file}
											</MenuItem>
										))}
									</Select>
								</FormControl>
							)}
					</>
				)}

			{isLoading && (
				<Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
					<CircularProgress size={20} />
				</Box>
			)}

			{error && (
				<Alert severity='error' sx={{ mt: 1 }}>
					{error}
				</Alert>
			)}
		</Box>
	);
};
