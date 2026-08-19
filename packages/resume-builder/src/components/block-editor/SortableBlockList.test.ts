import { describe, expect, it } from 'vitest';

import { getBlockDropSlot, getBlockMoveTarget } from './SortableBlockList.tsx';

describe('sortable block insertion', () => {
	it('places the insertion slot above or below the pointer midpoint', () => {
		expect(getBlockDropSlot(2, 119, 100, 40)).toBe(2);
		expect(getBlockDropSlot(2, 120, 100, 40)).toBe(3);
	});

	it('adjusts a downward move after removing the source item', () => {
		expect(getBlockMoveTarget(0, 3)).toBe(2);
	});

	it('does not adjust an upward move', () => {
		expect(getBlockMoveTarget(3, 1)).toBe(1);
	});

	it('keeps drops at either side of the source in place', () => {
		expect(getBlockMoveTarget(2, 2)).toBe(2);
		expect(getBlockMoveTarget(2, 3)).toBe(2);
	});
});
