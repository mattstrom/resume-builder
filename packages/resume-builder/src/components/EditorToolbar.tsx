import {
	AppBar,
	Button,
	Checkbox,
	CircularProgress,
	Divider,
	FormControl,
	FormControlLabel,
	InputLabel,
	MenuItem,
	Select,
	ToggleButton,
	ToggleButtonGroup,
	Toolbar,
	Typography,
} from '@mui/material';
import { useParams } from '@tanstack/react-router';
import { type FC, useState } from 'react';
import { useSettings } from './Settings.provider.tsx';
import { FileManagerToolbar, useFileManager } from './FileManager';
import { generatePDF } from '../utils/pdfExport';
import { useSnackbar } from './SnackbarProvider';

export const EditorToolbar: FC = () => {
	const {
		template,
		setTemplate,
		showMarginPattern,
		setShowMarginPattern,
		editorMode,
		setEditorMode,
	} = useSettings();

	const { resumeId } = useParams({ strict: false });
	const { resumeData } = useFileManager();
	const { showSnackbar } = useSnackbar();
	const [isExporting, setIsExporting] = useState(false);

	const onPrint = () => {
		const iframe = document.getElementById(
			'resume-preview-iframe',
		) as HTMLIFrameElement;
		if (iframe?.contentWindow) {
			iframe.contentWindow.print();
		} else {
			console.error('Preview iframe not found or not ready');
		}
	};

	const onExportPDF = async () => {
		setIsExporting(true);
		try {
			await generatePDF(resumeData || {});
			showSnackbar('PDF exported successfully!', 'success');
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: 'Failed to export PDF. Please try again.';
			showSnackbar(message, 'error');
		} finally {
			setIsExporting(false);
		}
	};

	const onPreview = () => {
		const params = new URLSearchParams({
			template,
			showMarginPattern: String(showMarginPattern),
		});

		window.open(`/preview/${resumeId}?${params.toString()}`);
	};

	return (
		<AppBar position="static" color="primary">
			<Toolbar sx={{ gap: 2, flexWrap: 'wrap', py: 1 }}>
				<Typography variant="h6" component="div">
					Resume Builder
				</Typography>

				<Divider
					orientation="vertical"
					flexItem
					sx={{ mx: 1, borderColor: 'rgba(255, 255, 255, 0.3)' }}
				/>

				<FileManagerToolbar />

				<Divider
					orientation="vertical"
					flexItem
					sx={{ mx: 1, borderColor: 'rgba(255, 255, 255, 0.3)' }}
				/>

				<ToggleButtonGroup
					value={editorMode}
					exclusive
					onChange={(_, newMode) => {
						if (newMode !== null) {
							setEditorMode(newMode);
						}
					}}
					size="small"
					sx={{
						'& .MuiToggleButton-root': {
							color: 'rgba(255, 255, 255, 0.7)',
							borderColor: 'rgba(255, 255, 255, 0.3)',
							'&:hover': {
								backgroundColor: 'rgba(255, 255, 255, 0.1)',
								borderColor: 'rgba(255, 255, 255, 0.5)',
							},
							'&.Mui-selected': {
								color: 'white',
								backgroundColor: 'rgba(255, 255, 255, 0.2)',
								borderColor: 'rgba(255, 255, 255, 0.5)',
								'&:hover': {
									backgroundColor:
										'rgba(255, 255, 255, 0.25)',
								},
							},
						},
					}}
				>
					<ToggleButton value="json">JSON</ToggleButton>
					<ToggleButton value="form">Form</ToggleButton>
					<ToggleButton value="review">Review</ToggleButton>
				</ToggleButtonGroup>

				<Divider
					orientation="vertical"
					flexItem
					sx={{ mx: 1, borderColor: 'rgba(255, 255, 255, 0.3)' }}
				/>

				<FormControl size="small" sx={{ minWidth: 120 }}>
					<InputLabel htmlFor="template" sx={{ color: 'white' }}>
						Template
					</InputLabel>
					<Select
						id="template"
						value={template}
						onChange={(ev) => {
							setTemplate(ev.target.value);
						}}
						label="Template"
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
						<MenuItem value="basic">Basic</MenuItem>
						<MenuItem value="column">Column</MenuItem>
						<MenuItem value="grid">Grid</MenuItem>
					</Select>
				</FormControl>

				<FormControlLabel
					label="Show Margin Pattern"
					control={
						<Checkbox
							id="marginPattern"
							checked={showMarginPattern}
							onChange={(ev) => {
								setShowMarginPattern(ev.target.checked);
							}}
							sx={{
								color: 'rgba(255, 255, 255, 0.7)',
								'&.Mui-checked': {
									color: 'white',
								},
							}}
						/>
					}
					sx={{ color: 'white' }}
				/>

				<Button
					onClick={onPrint}
					variant="outlined"
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
					Print
				</Button>

				<Button
					onClick={onExportPDF}
					disabled={isExporting}
					variant="outlined"
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
					{isExporting ? (
						<>
							<CircularProgress
								size={16}
								sx={{ mr: 1, color: 'white' }}
							/>
							Generating...
						</>
					) : (
						'Export PDF'
					)}
				</Button>

				<Button
					onClick={onPreview}
					variant="outlined"
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
					Preview
				</Button>

				{resumeData?.jobPostingUrl && (
					<Button
						onClick={() =>
							window.open(resumeData.jobPostingUrl, '_blank')
						}
						variant="outlined"
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
						Open Job Posting
					</Button>
				)}
			</Toolbar>
		</AppBar>
	);
};
