import type { Resume } from '../types';

const API_BASE_URL = 'http://localhost:3000';

export interface ApiError {
	message: string;
	status?: number;
}

export async function fetchResumes(): Promise<Resume[]> {
	try {
		const response = await fetch(`${API_BASE_URL}/resumes`);

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
		const response = await fetch(`${API_BASE_URL}/resumes/${_id}`);

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
