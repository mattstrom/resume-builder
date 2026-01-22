import { observer } from 'mobx-react';
import { type FC } from 'react';
import {
	Box,
	Button,
	FormControl,
	IconButton,
	InputLabel,
	MenuItem,
	Select,
	Tooltip,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from '@tanstack/react-router';
import { useStore } from '../../stores/store.provider.tsx';
import { useFileManager } from './FileManager.provider';

export const FileManagerToolbar: FC = observer(() => {
	const navigate = useNavigate();
	const { resumeStore } = useStore();
	const {
		directoryName,
		files,
		selectedFile,
		selectedApiResumeId,
		isLoading,
		isSupported,
		attachDirectory,
		detachDirectory,
		selectFile,
		refreshFiles,
		selectApiResume,
	} = useFileManager();

	if (!isSupported) {
		return null;
	}

	const resumes = resumeStore.data;

	return (
		<Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
			{/* API Resumes Dropdown */}
			{resumes.length > 0 && (
				<FormControl size="small" sx={{ minWidth: 180 }}>
					<InputLabel sx={{ color: 'white' }}>
						Backend Resume
					</InputLabel>
					<Select
						value={selectedApiResumeId ?? ''}
						label="Backend Resume"
						onChange={(e) => {
							const resumeId = e.target.value;
							selectApiResume(resumeId);
							navigate({
								to: '/editor/$resumeId',
								params: { resumeId },
							});
						}}
						disabled={isLoading}
						sx={{
							color: 'white',
							'.MuiOutlinedInput-notchedOutline': {
								borderColor: 'rgba(255, 255, 255, 0.3)',
							},
							'&:hover .MuiOutlinedInput-notchedOutline': {
								borderColor: 'rgba(255, 255, 255, 0.5)',
							},
							'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
								borderColor: 'white',
							},
							'.MuiSvgIcon-root': {
								color: 'white',
							},
						}}
					>
						{resumes.map((resume) => (
							<MenuItem key={resume._id} value={resume._id}>
								{resume.name}
							</MenuItem>
						))}
					</Select>
				</FormControl>
			)}

			{/* Local Files Section */}
			{!directoryName ? (
				<Tooltip title="Attach a local directory to load resume files">
					<Button
						variant="outlined"
						startIcon={<FolderOpenIcon />}
						onClick={attachDirectory}
						size="small"
						sx={{
							color: 'white',
							borderColor: 'rgba(255, 255, 255, 0.5)',
							'&:hover': {
								borderColor: 'white',
								backgroundColor: 'rgba(255, 255, 255, 0.1)',
							},
						}}
					>
						Local Files
					</Button>
				</Tooltip>
			) : (
				<Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
					{files.length > 0 && (
						<FormControl size="small" sx={{ minWidth: 150 }}>
							<InputLabel sx={{ color: 'white' }}>
								Local File
							</InputLabel>
							<Select
								value={selectedFile ?? ''}
								label="Local File"
								onChange={(e) => selectFile(e.target.value)}
								disabled={isLoading}
								sx={{
									color: 'white',
									'.MuiOutlinedInput-notchedOutline': {
										borderColor: 'rgba(255, 255, 255, 0.3)',
									},
									'&:hover .MuiOutlinedInput-notchedOutline':
										{
											borderColor:
												'rgba(255, 255, 255, 0.5)',
										},
									'&.Mui-focused .MuiOutlinedInput-notchedOutline':
										{
											borderColor: 'white',
										},
									'.MuiSvgIcon-root': {
										color: 'white',
									},
								}}
							>
								{files.map((file) => (
									<MenuItem key={file} value={file}>
										{file}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					)}

					<Tooltip title="Refresh files">
						<IconButton
							size="small"
							onClick={refreshFiles}
							sx={{
								color: 'white',
								'&:hover': {
									backgroundColor: 'rgba(255, 255, 255, 0.1)',
								},
							}}
						>
							<RefreshIcon fontSize="small" />
						</IconButton>
					</Tooltip>

					<Tooltip title="Detach directory">
						<IconButton
							size="small"
							onClick={detachDirectory}
							sx={{
								color: 'white',
								'&:hover': {
									backgroundColor: 'rgba(255, 255, 255, 0.1)',
								},
							}}
						>
							<CloseIcon fontSize="small" />
						</IconButton>
					</Tooltip>
				</Box>
			)}
		</Box>
	);
});
