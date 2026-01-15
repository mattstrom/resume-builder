import { type FC, useCallback, useEffect, useMemo, useState } from 'react';
import Editor, { type Monaco } from '@monaco-editor/react';
import { useFileManager } from '../FileManager';
import { validateResume } from '../../utils/resumeValidation';
import resumeSchema from '@resume-builder/entities/schemas/resume.schema.json';
import type { Resume } from '@resume-builder/entities';

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number,
): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout;
	return (...args: Parameters<T>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}

export const JsonEditor: FC = () => {
	const { resumeData, updateResumeData } = useFileManager();
	const [jsonString, setJsonString] = useState<string>('');
	const [validationErrors, setValidationErrors] = useState<string[]>([]);

	// Sync resumeData to jsonString when it changes externally
	useEffect(() => {
		if (resumeData) {
			setJsonString(JSON.stringify(resumeData, null, 2));
		}
	}, [resumeData]);

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
						updateResumeData(parsed as Resume);
						setValidationErrors([]);
					} else {
						setValidationErrors(validation.errors);
					}
				} catch (error) {
					if (error instanceof Error) {
						setValidationErrors([`JSON Parse Error: ${error.message}`]);
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
		<div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
			<div style={{ flex: 1, overflow: 'hidden' }}>
				<Editor
					height="100%"
					defaultLanguage="json"
					theme="vs-dark"
					value={jsonString}
					onChange={handleEditorChange}
					options={{
						minimap: { enabled: true },
						formatOnPaste: true,
						formatOnType: true,
						scrollBeyondLastLine: false,
						automaticLayout: true,
						tabSize: 2,
					}}
					beforeMount={handleEditorWillMount}
				/>
			</div>
			{validationErrors.length > 0 && (
				<div
					style={{
						padding: '8px',
						backgroundColor: '#f44336',
						color: 'white',
						fontSize: '12px',
						maxHeight: '100px',
						overflow: 'auto',
					}}
				>
					<strong>Validation Errors:</strong>
					<ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
						{validationErrors.map((error, idx) => (
							<li key={idx}>{error}</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
};
