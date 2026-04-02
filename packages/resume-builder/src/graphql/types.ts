import type { Application, Resume } from '@resume-builder/entities';
import type { ResumeCollectionValue } from './resume-collections.ts';

export interface ListApplicationsData {
	listApplications: Application[];
}

export interface GetApplicationData {
	getApplication: Application;
}

export interface CreateApplicationData {
	createApplication: Application;
}

export interface UpdateApplicationData {
	updateApplication: Application;
}

export interface GetApplicationVariables {
	id: string;
}

export interface CreateApplicationVariables {
	applicationData: Omit<
		Application,
		'_id' | 'uid' | 'createdAt' | 'updatedAt'
	>;
}

export interface UpdateApplicationVariables {
	id: string;
	applicationData: Partial<
		Omit<Application, '_id' | 'uid' | 'createdAt' | 'updatedAt'>
	>;
}

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

export interface AddResumeCollectionItemData {
	addResumeCollectionItem: Resume;
}

export interface AddResumeCollectionItemVariables {
	id: string;
	input: { collection: ResumeCollectionValue };
}

export interface RemoveResumeCollectionItemData {
	removeResumeCollectionItem: Resume;
}

export interface RemoveResumeCollectionItemVariables {
	id: string;
	input: { collection: ResumeCollectionValue; index: number };
}
