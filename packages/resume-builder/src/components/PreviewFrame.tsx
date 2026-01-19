import { type FC, useMemo } from 'react';
import { useFileManager } from './FileManager';
import { useSettings } from './Settings.provider.tsx';

export const PreviewFrame: FC = () => {
	const { resumeData } = useFileManager();
	const { template, showMarginPattern } = useSettings();

	// Construct iframe src URL from resume ID and settings
	const iframeSrc = useMemo(() => {
		if (!resumeData?._id) {
			return null;
		}

		const params = new URLSearchParams({
			template,
			showMarginPattern: String(showMarginPattern),
		});

		return `/preview/${resumeData._id}?${params.toString()}`;
	}, [resumeData?._id, template, showMarginPattern]);

	if (!iframeSrc) {
		return (
			<div
				style={{ width: '100%', height: '100%', position: 'relative' }}
			>
				<div
					style={{
						position: 'absolute',
						top: '50%',
						left: '50%',
						transform: 'translate(-50%, -50%)',
						fontSize: '1rem',
						color: '#666',
					}}
				>
					No resume loaded
				</div>
			</div>
		);
	}

	return (
		<div style={{ width: '100%', height: '100%', position: 'relative' }}>
			<iframe
				id="resume-preview-iframe"
				src={iframeSrc}
				title="Resume Preview"
				sandbox="allow-same-origin allow-scripts allow-modals"
				style={{
					width: '100%',
					height: '100%',
					border: 'none',
				}}
			/>
		</div>
	);
};
