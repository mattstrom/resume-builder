import {
	Button,
	Checkbox,
	Divider,
	FormControl,
	FormControlLabel,
	InputLabel,
	MenuItem,
	Select,
} from '@mui/material';
import { type FC } from 'react';
import { useSettings } from './Settings.provider.tsx';
import { FileManager } from './FileManager';

interface ControlsProps {}

export const Controls: FC<ControlsProps> = () => {
	const { template, setTemplate, showMarginPattern, setShowMarginPattern } =
		useSettings();

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

	return (
		<form>
			<FileManager />

			<Divider sx={{ my: 2 }} />

			<div>
				<FormControl>
					<InputLabel htmlFor='template'>Template</InputLabel>
					<Select
						id='template'
						value={template}
						onChange={(ev) => {
							setTemplate(ev.target.value);
						}}
					>
						<MenuItem value='basic'>Basic</MenuItem>
						<MenuItem value='column'>Column</MenuItem>
						<MenuItem value='grid'>Grid</MenuItem>
					</Select>
				</FormControl>
			</div>
			<div>
				<FormControlLabel
					label='Show Margin Pattern'
					control={
						<Checkbox
							id='marginPattern'
							checked={showMarginPattern}
							onChange={(ev) => {
								setShowMarginPattern(ev.target.checked);
							}}
						/>
					}
				/>
			</div>
			<div>
				<Button onClick={onPrint}>Print</Button>
			</div>
		</form>
	);
};
