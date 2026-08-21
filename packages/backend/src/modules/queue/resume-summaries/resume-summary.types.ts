import type { ResumeSummaryValue } from '@resume-builder/entities';

export interface ResumeSummaryTarget {
	resumeId: string;
	sourceUpdatedAt: string;
}

export type GenerateResumeSummaryJobData = ResumeSummaryTarget;

export interface ReconcileResumeSummariesJobData {
	limit?: number;
}

export interface ResumeSummaryDocument extends ResumeSummaryTarget {
	uid: string;
	name: string;
	company: string;
	level?: string;
	content: unknown;
}

export interface ResumeSummaryDocumentProvider {
	findStaleTargets(limit?: number): Promise<ResumeSummaryTarget[]>;
	loadDocument(resumeId: string): Promise<ResumeSummaryDocument | null>;
	saveIfCurrent(
		resumeId: string,
		sourceUpdatedAt: string,
		summary: ResumeSummaryValue,
	): Promise<number | null>;
}
