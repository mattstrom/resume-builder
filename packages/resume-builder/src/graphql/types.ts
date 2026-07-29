import type { Application, Resume } from '@resume-builder/entities';

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
	applicationData: Omit<Application, '_id' | 'uid' | 'createdAt' | 'updatedAt'>;
	sourceResumeId?: string;
}

export interface UpdateApplicationVariables {
	id: string;
	applicationData: Partial<
		Omit<
			Application,
			| '_id'
			| 'uid'
			| 'createdAt'
			| 'updatedAt'
			| 'jobDescription'
			| 'notionId'
			| 'coverLetterId'
			| 'jobSummary'
			| 'analysis'
			| 'notes'
		> & {
			jobDescription?: Application['jobDescription'] | null;
			notionId?: Application['notionId'] | null;
			coverLetterId?: Application['coverLetterId'] | null;
			jobSummary?: Application['jobSummary'] | null;
			analysis?: Application['analysis'] | null;
			notes?: Application['notes'] | null;
		}
	>;
}

export interface ListResumesData {
	listResumes: Resume[];
}

export type BaseResumeSummary = Pick<Resume, '_id' | 'name' | 'base'>;

export interface ListBaseResumesData {
	listResumes: BaseResumeSummary[];
}

export interface ListResumesVariables {
	sort?: { field: string; ascending: boolean };
	filter?: { base?: boolean; company?: string; applicationId?: string };
}

export interface GetResumeData {
	getResume: Resume;
}

export interface CreateBlankResumeData {
	createBlankResume: Resume;
}

export interface CreateBlankResumeVariables {
	resumeData: {
		name: string;
		company: string;
		jobPostingUrl: string;
		base: boolean;
		applicationId?: string;
		sourceResumeId?: string;
	};
}

export interface GetResumeVariables {
	id: string;
}
