import { type FC, useEffect, useRef, useState } from 'react';
import { useFileManager } from './FileManager';
import { useSettings } from './Settings.provider.tsx';
import {
	isPreviewMessage,
	sendToPreview,
	validateOrigin,
} from '../utils/previewMessaging.ts';

export const PreviewFrame: FC = () => {
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const [isReady, setIsReady] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	const { resumeData } = useFileManager();
	const { template, showMarginPattern } = useSettings();

	// Listen for READY message from iframe
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			// Validate origin for security
			if (!validateOrigin(event.origin)) {
				console.error('Invalid message origin:', event.origin);
				return;
			}

			// Validate message structure
			if (!isPreviewMessage(event.data)) {
				return;
			}

			const message = event.data;

			if (message.type === 'READY') {
				setIsReady(true);
				setIsLoading(false);
			} else if (message.type === 'ERROR') {
				console.error('Preview iframe error:', message.payload.error);
			}
		};

		window.addEventListener('message', handleMessage);

		return () => {
			window.removeEventListener('message', handleMessage);
		};
	}, []);

	// Send initial data when iframe is ready
	useEffect(() => {
		if (!isReady || !iframeRef.current?.contentWindow) {
			return;
		}

		// Send initial resume data
		if (resumeData) {
			sendToPreview(iframeRef.current.contentWindow, 'RESUME_DATA_UPDATE', {
				resumeData: resumeData.data,
			});
		}

		// Send initial settings
		sendToPreview(iframeRef.current.contentWindow, 'SETTINGS_UPDATE', {
			template: template as 'basic' | 'column' | 'grid',
			showMarginPattern,
		});
	}, [isReady]);

	// Send resume data updates when data changes
	useEffect(() => {
		if (!isReady || !iframeRef.current?.contentWindow || !resumeData) {
			return;
		}

		sendToPreview(iframeRef.current.contentWindow, 'RESUME_DATA_UPDATE', {
			resumeData: resumeData.data,
		});
	}, [isReady, resumeData]);

	// Send settings updates when they change
	useEffect(() => {
		if (!isReady || !iframeRef.current?.contentWindow) {
			return;
		}

		sendToPreview(iframeRef.current.contentWindow, 'SETTINGS_UPDATE', {
			template: template as 'basic' | 'column' | 'grid',
			showMarginPattern,
		});
	}, [isReady, template, showMarginPattern]);

	return (
		<div style={{ width: '100%', height: '100%', position: 'relative' }}>
			{isLoading && (
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
					Loading preview...
				</div>
			)}
			<iframe
				id="resume-preview-iframe"
				ref={iframeRef}
				src="/preview"
				title="Resume Preview"
				sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox allow-modals"
				style={{
					width: '100%',
					height: '100%',
					border: 'none',
					display: isLoading ? 'none' : 'block',
				}}
			/>
		</div>
	);
};
