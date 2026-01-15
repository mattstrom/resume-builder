export interface ContactInformation {
	location: string;
	phoneNumber: string;
	email: string;
	linkedInProfile: string;
	githubProfile: string;
}

export interface Job {
	company: string;
	position: string;
	location: string;
	startDate: string;
	endDate?: string;
	responsibilities: string[];
}

export interface Education {
	degree: string;
	field: string;
	institution: string;
	graduated: string;
}

export interface Skill {
	name: string;
	category: string;
}

export interface SkillGroup {
	name: string;
	items: string[];
}

export interface Project {
	name: string;
	technologies: string[];
	items: string[];
}

export interface Resume {
	_id: string;
	id?: string;
	name: string;
	data: {
		name: string;
		title: string;
		contactInformation: ContactInformation;
		summary: string;
		workExperience: Job[];
		education: Education[];
		skills: Skill[];
		skillGroups: SkillGroup[];
		projects: Project[];
	};
}
