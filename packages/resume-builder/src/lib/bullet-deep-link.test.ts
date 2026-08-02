import { BulletSourceType } from '@resume-builder/entities';
import { describe, expect, it } from 'vitest';

import { bulletDeepLinkSearchSchema, bulletSourceRoute } from './bullet-deep-link.ts';

describe('bullet deep links', () => {
	it.each([
		[BulletSourceType.JOB, '/profile/work-history'],
		[BulletSourceType.PROJECT, '/profile/projects'],
		[BulletSourceType.VOLUNTEERING, '/profile/volunteering'],
	])('routes %s bullets to their source editor', (sourceType, route) => {
		expect(bulletSourceRoute(sourceType)).toBe(route);
	});

	it('accepts a bullet id and ignores invalid search values', () => {
		expect(bulletDeepLinkSearchSchema.parse({ bulletId: 'bullet-1' })).toEqual({
			bulletId: 'bullet-1',
		});
		expect(bulletDeepLinkSearchSchema.parse({ bulletId: 1 })).toEqual({});
	});
});
