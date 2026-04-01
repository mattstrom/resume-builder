import type { Resume } from '@resume-builder/entities';

export interface ListResumesData {
	listResumes: Resume[];
}

export interface GetResumeData {
	getResume: Resume;
}

export interface CreateResumeData {
	createResume: Resume;
}

export interface UpdateResumeData {
	updateResume: Resume;
}

export interface GetResumeVariables {
	id: string;
}

export interface CreateResumeVariables {
	resumeData: Omit<Resume, '_id'>;
}

export interface UpdateResumeVariables {
	id: string;
	resumeData: Partial<Omit<Resume, '_id'>>;
}

export interface SetResumeFieldData {
	setResumeField: Resume;
}

export interface SetResumeFieldVariables {
	id: string;
	input: { path: string };
	value: unknown;
}
