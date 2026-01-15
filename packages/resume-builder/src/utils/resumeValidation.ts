import type {
	ContactInformation,
	Education,
	Job,
	Project,
	Resume,
	SkillGroup,
} from '@resume-builder/entities';

interface ValidationResult {
	valid: boolean;
	errors: string[];
}

function isValidContactInfo(data: unknown): data is ContactInformation {
	if (!data || typeof data !== 'object') return false;
	const obj = data as Record<string, unknown>;
	return (
		typeof obj.location === 'string' &&
		typeof obj.phoneNumber === 'string' &&
		typeof obj.email === 'string' &&
		typeof obj.linkedInProfile === 'string' &&
		typeof obj.githubProfile === 'string'
	);
}

function isValidJob(data: unknown): data is Job {
	if (!data || typeof data !== 'object') return false;
	const obj = data as Record<string, unknown>;
	return (
		typeof obj.company === 'string' &&
		typeof obj.position === 'string' &&
		typeof obj.location === 'string' &&
		typeof obj.startDate === 'string' &&
		Array.isArray(obj.responsibilities)
	);
}

function isValidEducation(data: unknown): data is Education {
	if (!data || typeof data !== 'object') return false;
	const obj = data as Record<string, unknown>;
	return (
		typeof obj.degree === 'string' &&
		typeof obj.field === 'string' &&
		typeof obj.institution === 'string' &&
		typeof obj.graduated === 'string'
	);
}

function isValidSkillGroup(data: unknown): data is SkillGroup {
	if (!data || typeof data !== 'object') return false;
	const obj = data as Record<string, unknown>;
	return typeof obj.name === 'string' && Array.isArray(obj.items);
}

function isValidProject(data: unknown): data is Project {
	if (!data || typeof data !== 'object') return false;
	const obj = data as Record<string, unknown>;
	return (
		typeof obj.name === 'string' &&
		Array.isArray(obj.technologies) &&
		Array.isArray(obj.items)
	);
}

export function validateResume(data: unknown): ValidationResult {
	const errors: string[] = [];

	if (!data || typeof data !== 'object') {
		return { valid: false, errors: ['Data must be an object'] };
	}

	const resume = data as Record<string, unknown>;

	if (!resume.data || typeof resume.data !== 'object') {
		return { valid: false, errors: ['Missing "data" property'] };
	}

	const obj = resume.data as Record<string, unknown>;

	if (typeof obj.name !== 'string') {
		errors.push('Missing or invalid "name" field');
	}
	if (typeof obj.title !== 'string') {
		errors.push('Missing or invalid "title" field');
	}
	if (typeof obj.summary !== 'string') {
		errors.push('Missing or invalid "summary" field');
	}
	if (!isValidContactInfo(obj.contactInformation)) {
		errors.push('Missing or invalid "contactInformation" object');
	}
	if (!Array.isArray(obj.workExperience)) {
		errors.push('Missing "workExperience" array');
	} else if (!obj.workExperience.every(isValidJob)) {
		errors.push('Invalid job entry in "workExperience"');
	}
	if (!Array.isArray(obj.education)) {
		errors.push('Missing "education" array');
	} else if (!obj.education.every(isValidEducation)) {
		errors.push('Invalid entry in "education"');
	}
	// skills and skillGroups are both optional
	if (obj.skills !== undefined) {
		if (!Array.isArray(obj.skills)) {
			errors.push('Invalid "skills" field - must be an array');
		}
	}
	if (obj.skillGroups !== undefined) {
		if (!Array.isArray(obj.skillGroups)) {
			errors.push('Invalid "skillGroups" field - must be an array');
		} else if (!obj.skillGroups.every(isValidSkillGroup)) {
			errors.push('Invalid entry in "skillGroups"');
		}
	}
	if (!Array.isArray(obj.projects)) {
		errors.push('Missing "projects" array');
	} else if (!obj.projects.every(isValidProject)) {
		errors.push('Invalid entry in "projects"');
	}

	return { valid: errors.length === 0, errors };
}

export function isValidResume(data: unknown): data is Resume {
	return validateResume(data).valid;
}
