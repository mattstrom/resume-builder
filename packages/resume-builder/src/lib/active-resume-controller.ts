import type { ResumeDocumentController } from './resume-document-controller.ts';

let activeResumeController: ResumeDocumentController | null = null;

export function setActiveResumeController(
	controller: ResumeDocumentController | null,
) {
	activeResumeController = controller;
}

export function getActiveResumeController(resumeId?: string) {
	if (!activeResumeController) {
		return null;
	}

	if (resumeId && activeResumeController.resumeId !== resumeId) {
		return null;
	}

	return activeResumeController;
}
