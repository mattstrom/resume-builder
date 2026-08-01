import type { Job } from '@resume-builder/entities';

function startDateTimestamp(job: Job): number {
	const timestamp = Date.parse(job.startDate);
	return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

export function sortJobsByStartDateDescending(jobs: Job[]): Job[] {
	return [...jobs].sort((left, right) => startDateTimestamp(right) - startDateTimestamp(left));
}
