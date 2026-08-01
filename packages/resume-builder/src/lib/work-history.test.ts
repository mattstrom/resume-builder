import type { Job } from '@resume-builder/entities';
import { describe, expect, it } from 'vitest';

import { sortJobsByStartDateDescending } from './work-history.ts';

function job(_id: string, startDate: string): Job {
	return {
		_id,
		uid: 'user-1',
		company: '',
		position: '',
		location: '',
		startDate,
		responsibilities: [],
	};
}

describe('sortJobsByStartDateDescending', () => {
	it('orders recent work first and leaves undated work at the end', () => {
		const original = [
			job('older', '2019-03-01'),
			job('undated', ''),
			job('newer', '2024-06-01'),
		];

		expect(sortJobsByStartDateDescending(original).map(({ _id }) => _id)).toEqual([
			'newer',
			'older',
			'undated',
		]);
		expect(original.map(({ _id }) => _id)).toEqual(['older', 'undated', 'newer']);
	});
});
