import type { Resume } from '@resume-builder/entities';

import { authFetch } from './auth';

const API_BASE_URL = 'http://localhost:3000';

export interface ApiError {
	message: string;
	status?: number;
}

export async function fetchResumes(): Promise<Resume[]> {
	try {
		const response = await authFetch(`${API_BASE_URL}/resumes`);

		if (!response.ok) {
			throw new Error(
				`Failed to fetch resumes: ${response.status} ${response.statusText}`,
			);
		}

		const data = await response.json();
		return data;
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error('Failed to fetch resumes from backend');
	}
}

export async function fetchResumeById(_id: string): Promise<Resume> {
	try {
		const response = await authFetch(`${API_BASE_URL}/resumes/${_id}`);

		if (!response.ok) {
			throw new Error(
				`Failed to fetch resume: ${response.status} ${response.statusText}`,
			);
		}

		const data = await response.json();
		return data;
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error(`Failed to fetch resume with _id: ${_id}`);
	}
}

export async function createResume(data: Resume): Promise<Resume> {
	try {
		const response = await authFetch(`${API_BASE_URL}/resumes`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error(
				`Failed to create resume: ${response.status} ${response.statusText}`,
			);
		}

		const result = await response.json();
		return result;
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error('Failed to create resume');
	}
}

export async function updateResume(_id: string, data: Resume): Promise<Resume> {
	try {
		const response = await authFetch(`${API_BASE_URL}/resumes/${_id}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error(
				`Failed to update resume: ${response.status} ${response.statusText}`,
			);
		}

		const result = await response.json();
		return result;
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error(`Failed to update resume with _id: ${_id}`);
	}
}
