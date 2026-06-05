import type { Analysis, JobSummary } from './models/application.js';
import type { ResumeContent } from './models/resume-content.js';

export interface PgResume {
	id: string;
	uid: string;
	name: string;
	company: string;
	level: string | null;
	jobPostingUrl: string;
	readOnly: boolean;
	base: boolean;
	applicationId: string | null;
	sourceResumeId: string | null;
	data: ResumeContent;
	createdAt: Date;
	updatedAt: Date;
}

export interface PgApplication {
	id: string;
	uid: string;
	name: string;
	company: string;
	jobPostingUrl: string;
	jobDescription: string | null;
	notionId: string | null;
	coverLetterId: string | null;
	jobSummary: JobSummary | null;
	analysis: Analysis | null;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface PgCoverLetter {
	id: string;
	uid: string;
	name: string;
	company: string;
	jobPostingUrl: string;
	content: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface PgContactInformation {
	id: string;
	uid: string;
	location: string;
	phoneNumber: string;
	email: string;
	linkedInProfile: string;
	githubProfile: string;
	personalWebsite: string;
	createdAt: Date;
	updatedAt: Date;
}
