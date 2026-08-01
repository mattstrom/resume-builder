import { BulletSourceType, BulletStatus } from '@resume-builder/entities';
import { describe, expect, it } from 'vitest';

import {
	bulletFromGraphql,
	bulletStatusGraphqlValue,
	createBulletGraphqlInput,
} from './bullet-graphql.ts';

describe('bullet GraphQL enum conversion', () => {
	it('sends GraphQL enum member names for bullet mutations', () => {
		expect(
			createBulletGraphqlInput({
				text: 'Improved latency',
				sourceType: BulletSourceType.JOB,
				sourceId: 'job-1',
			}),
		).toEqual({
			text: 'Improved latency',
			sourceType: 'JOB',
			sourceId: 'job-1',
		});
		expect(bulletStatusGraphqlValue(BulletStatus.ARCHIVED)).toBe('ARCHIVED');
	});

	it('converts GraphQL enum member names to application values', () => {
		const bullet = bulletFromGraphql({
			id: 'bullet-1',
			uid: 'user-1',
			text: 'Improved latency',
			sourceType: 'JOB',
			sourceId: 'job-1',
			status: 'DRAFT',
			position: 0,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		expect(bullet.sourceType).toBe(BulletSourceType.JOB);
		expect(bullet.status).toBe(BulletStatus.DRAFT);
	});
});
