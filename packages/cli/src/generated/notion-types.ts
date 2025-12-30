// Auto-generated from Notion database schemas
// Do not edit manually

export interface Dev {
	multiSelect: string[];
	email: string | null;
	url: string | null;
	checkbox: boolean;
	text: string;
	status: string | null;
	date: string | null;
	select: string | null;
	filesMedia: string[];
	person: string[];
	phone: string | null;
	number: number;
	title: string;
}

export interface Education {
	graduationDate: string | null;
	field: string;
	resumes: string[];
	institution: string;
	degree: string;
}

export interface Projects {
	resumes: string[];
	skills: string[];
	repo: string | null;
	name: string;
}

export interface Resumes {
	createdBy: string;
	workHistory: string[];
	lastUpdatedTime: string;
	createdTime: string;
	summary: string;
	lastEditedBy: string;
	phone: string | null;
	applications: string[];
	id: unknown;
	skills: string[];
	email: string | null;
	linkedinProfile: string | null;
	position: unknown;
	education: string[];
	githubProfile: string | null;
	projects: string[];
	candidateName: string;
	files: string[];
	location: string;
	status: unknown;
	company: unknown;
	name: string;
}

export interface Responsibilities {
	workHistory: string[];
	description: string;
}

export interface Skills {
	category: string | null;
	resumes: string[];
	projects: string[];
	rank: number;
	name: string;
}

export interface WorkHistory {
	location: string;
	endDate: string | null;
	company: string;
	dateRange: unknown;
	startDate: string | null;
	responsibilities: string[];
	resumes: string[];
	position: string;
}
