import type { Analysis, JobSummary } from './models/application.js';
import type { CompanyAddress, CompanyType, LocationType } from './models/company.js';
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
	companyId: string | null;
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

export interface PgCompany {
	id: string;
	name: string;
	type: CompanyType;
	website: string;
	logoUrl: string;
	locationType: LocationType;
	address: CompanyAddress;
	createdAt: Date;
	createdBy: string;
	updatedAt: Date;
	updatedBy: string;
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

export interface PgJob {
	id: string;
	uid: string;
	company: string;
	position: string;
	location: string;
	startDate: string;
	endDate: string | null;
	responsibilities: string[];
	relevance: number | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface PgEducation {
	id: string;
	uid: string;
	degree: string;
	field: string;
	institution: string;
	graduated: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface PgProject {
	id: string;
	uid: string;
	name: string;
	description: string;
	technologies: string[];
	items: string[];
	type: 'professional' | 'personal' | null;
	relevance: number | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface PgSkill {
	id: string;
	uid: string;
	name: string;
	category: string;
	relevance: number | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface PgSkillGroup {
	id: string;
	uid: string;
	name: string;
	items: string[];
	createdAt: Date;
	updatedAt: Date;
}

export interface PgVolunteering {
	id: string;
	uid: string;
	organization: string | null;
	position: string;
	location: string | null;
	startDate: string;
	endDate: string | null;
	responsibilities: string[];
	relevance: number | null;
	createdAt: Date;
	updatedAt: Date;
}
