import { BulletSourceType, BulletStatus, type Bullet } from '@resume-builder/entities';
import { describe, expect, it } from 'vitest';

import { getBulletPickerCandidates } from '../lib/bullet-picker.ts';

function bullet(id: string, sourceId: string, status = BulletStatus.READY): Bullet {
	return {
		id,
		uid: 'user-1',
		text: `${id} text`,
		sourceType: BulletSourceType.JOB,
		sourceId,
		status,
		position: 0,
		createdAt: new Date(),
		updatedAt: new Date(),
	};
}

describe('getBulletPickerCandidates', () => {
	it('places source matches first and excludes archived bullets', () => {
		const result = getBulletPickerCandidates(
			[
				bullet('other', 'job-2'),
				bullet('archived', 'job-1', BulletStatus.ARCHIVED),
				bullet('match', 'job-1', BulletStatus.DRAFT),
			],
			{ search: '', sourceType: BulletSourceType.JOB, sourceId: 'job-1' },
		);

		expect(result.map(({ id }) => id)).toEqual(['match', 'other']);
	});

	it('searches the entire active bank', () => {
		const result = getBulletPickerCandidates(
			[bullet('latency', 'job-2'), bullet('revenue', 'job-1')],
			{ search: 'LATENCY', sourceType: BulletSourceType.JOB, sourceId: 'job-1' },
		);

		expect(result.map(({ id }) => id)).toEqual(['latency']);
	});
});
