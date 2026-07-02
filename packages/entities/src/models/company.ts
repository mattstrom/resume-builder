export const UNSPECIFIED_COMPANY_NAME = 'Unspecified';

export interface Company {
	id: string;
	name: string;
	applicationIds: string[];
	resumeIds: string[];
	applicationCount: number;
	resumeCount: number;
	updatedAt: Date | string | null;
}

export function normalizeCompanyName(company?: string | null): string {
	return company?.trim() || UNSPECIFIED_COMPANY_NAME;
}
