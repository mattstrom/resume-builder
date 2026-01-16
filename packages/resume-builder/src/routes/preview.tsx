import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import type { Resume } from '@resume-builder/entities';
import { ResumeProvider } from '../components/Resume.provider.tsx';
import { BasicLayout, ColumnLayout } from '../components/layouts';
import { GridLayout } from '../components/layouts/GridLayout.tsx';
import { resume as defaultResume } from '../data/resume.ts';
import {
	isPreviewMessage,
	sendToPreview,
	validateOrigin,
} from '../utils/previewMessaging.ts';

// Import CSS for proper styling
import '../App.css';

export const Route = createFileRoute('/preview')({
	component: PreviewComponent,
});

function PreviewComponent() {
	// Local state for resume data and settings received from parent
	const [resumeData, setResumeData] = useState<Resume>(defaultResume);
	const [template, setTemplate] = useState<'basic' | 'column' | 'grid'>('grid');
	const [showMarginPattern, setShowMarginPattern] = useState(true);

	useEffect(() => {
		// Send READY message to parent window to signal iframe has loaded
		if (window.parent !== window) {
			sendToPreview(window.parent, 'READY');
		}

		// Set up message listener for updates from parent
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

			try {
				switch (message.type) {
					case 'RESUME_DATA_UPDATE':
						if (message.payload.resumeData) {
							// Update local resume data with data from parent
							setResumeData((prevResume) => ({
								...prevResume,
								data: message.payload.resumeData!,
							}));
						}
						break;

					case 'SETTINGS_UPDATE':
						// Update template if provided
						if (message.payload.template) {
							setTemplate(message.payload.template);
						}
						// Update margin pattern if provided
						if (message.payload.showMarginPattern !== undefined) {
							setShowMarginPattern(message.payload.showMarginPattern);
						}
						break;

					default:
						break;
				}
			} catch (error) {
				console.error('Error handling preview message:', error);
				if (window.parent !== window) {
					sendToPreview(window.parent, 'ERROR', {
						error: error instanceof Error ? error.message : 'Unknown error',
					});
				}
			}
		};

		window.addEventListener('message', handleMessage);

		// Cleanup listener on unmount
		return () => {
			window.removeEventListener('message', handleMessage);
		};
	}, []);

	// Render the selected template
	const templateComponent = (() => {
		switch (template) {
			case 'column':
				return <ColumnLayout />;
			case 'grid':
				return <GridLayout />;
			default:
				return <BasicLayout />;
		}
	})();

	// Apply margin pattern class if enabled
	const className = showMarginPattern ? 'show-margin-pattern' : '';

	return (
		<ResumeProvider data={resumeData}>
			<div className={className}>{templateComponent}</div>
		</ResumeProvider>
	);
}
