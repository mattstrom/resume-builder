import type { Resume } from '@resume-builder/entities';

export type PreviewMessageType =
	| 'RESUME_DATA_UPDATE'
	| 'SETTINGS_UPDATE'
	| 'READY'
	| 'ERROR';

export interface PreviewMessage {
	type: PreviewMessageType;
	payload: {
		resumeData?: Resume['data'];
		template?: 'basic' | 'column' | 'grid';
		showMarginPattern?: boolean;
		error?: string;
	};
	timestamp: number;
}

export function isPreviewMessage(data: unknown): data is PreviewMessage {
	if (typeof data !== 'object' || data === null) {
		return false;
	}

	const msg = data as Partial<PreviewMessage>;

	return (
		typeof msg.type === 'string' &&
		['RESUME_DATA_UPDATE', 'SETTINGS_UPDATE', 'READY', 'ERROR'].includes(
			msg.type,
		) &&
		typeof msg.payload === 'object' &&
		msg.payload !== null &&
		typeof msg.timestamp === 'number'
	);
}

export function sendToPreview(
	targetWindow: Window,
	type: PreviewMessageType,
	payload: PreviewMessage['payload'] = {},
): void {
	const message: PreviewMessage = {
		type,
		payload,
		timestamp: Date.now(),
	};

	// Send to same origin only
	targetWindow.postMessage(message, window.location.origin);
}

export function validateOrigin(origin: string): boolean {
	return origin === window.location.origin;
}
