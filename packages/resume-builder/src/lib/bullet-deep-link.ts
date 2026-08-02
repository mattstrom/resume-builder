import { BulletSourceType } from '@resume-builder/entities';
import { z } from 'zod';

export const bulletDeepLinkSearchSchema = z
	.object({
		bulletId: z.string().optional(),
	})
	.catch({});

const BULLET_SOURCE_ROUTES = {
	[BulletSourceType.JOB]: '/profile/work-history',
	[BulletSourceType.PROJECT]: '/profile/projects',
	[BulletSourceType.VOLUNTEERING]: '/profile/volunteering',
} as const;

export function bulletSourceRoute(sourceType: BulletSourceType) {
	return BULLET_SOURCE_ROUTES[sourceType];
}
