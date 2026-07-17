import { describe, expect, it } from 'vitest';

import { formatMonthYear } from './date-format.ts';

describe('formatMonthYear', () => {
	it('preserves the month of a date-only value', () => {
		expect(formatMonthYear('2019-03-01')).toBe('March 2019');
	});

	it('falls back to the original value when the date is invalid', () => {
		expect(formatMonthYear('not a date')).toBe('not a date');
	});
});
