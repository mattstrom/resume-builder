import { describe, expect, it } from 'vitest';

import { getPrintableOverflowTarget, planPagination } from './pagination-planner.ts';

describe('planPagination', () => {
	it('keeps content that fits on one page together', () => {
		expect(
			planPagination({
				pageHeight: 100,
				contentHeight: 80,
				blocks: [{ id: 'summary', kind: 'unit', start: 0, end: 80 }],
			}),
		).toEqual({ breaks: [], oversizedUnitIds: [], pageCount: 1 });
	});

	it('creates as many pages as the content requires', () => {
		const plan = planPagination({
			pageHeight: 100,
			contentHeight: 260,
			blocks: [
				{ id: 'one', kind: 'unit', start: 0, end: 80 },
				{ id: 'two', kind: 'unit', start: 80, end: 160 },
				{ id: 'three', kind: 'unit', start: 160, end: 260 },
			],
		});

		expect(plan.pageCount).toBe(3);
		expect(plan.breaks.map(({ id }) => id)).toEqual(['two', 'three']);
	});

	it('moves an entry intact when it fits on the next page', () => {
		const plan = planPagination({
			pageHeight: 100,
			contentHeight: 110,
			blocks: [{ id: 'job', kind: 'unit', start: 70, end: 110 }],
		});

		expect(plan.breaks).toEqual([{ id: 'job', offset: 30 }]);
	});

	it('splits an oversized entry between its child blocks', () => {
		const plan = planPagination({
			pageHeight: 100,
			contentHeight: 250,
			blocks: [
				{
					id: 'job',
					kind: 'unit',
					start: 20,
					end: 250,
					subunits: [
						{ id: 'bullet-1', start: 50, end: 90 },
						{ id: 'bullet-2', start: 90, end: 140 },
						{ id: 'bullet-3', start: 140, end: 190 },
						{ id: 'bullet-4', start: 190, end: 240 },
					],
				},
			],
		});

		expect(plan.oversizedUnitIds).toEqual(['job']);
		// bullet-4 lands exactly on the page 3 boundary, so it gets a zero-offset
		// break that tells the screen where the page gap belongs.
		expect(plan.breaks).toEqual([
			{ id: 'bullet-2', offset: 10 },
			{ id: 'bullet-4', offset: 0 },
		]);
		expect(plan.pageCount).toBe(3);
	});

	it('keeps a section heading with its first entry', () => {
		const plan = planPagination({
			pageHeight: 100,
			contentHeight: 115,
			blocks: [
				{
					id: 'work-heading',
					kind: 'heading',
					start: 80,
					end: 90,
					keepWithEnd: 115,
				},
				{ id: 'first-job', kind: 'unit', start: 90, end: 115 },
			],
		});

		expect(plan.breaks).toEqual([{ id: 'work-heading', offset: 20 }]);
	});

	it('breaks before a heading whose section margin pushes it past the page end', () => {
		// Arrange: the previous section ends inside page 1, but the section
		// margin places the next heading just past the page boundary.
		const input = {
			pageHeight: 100,
			contentHeight: 180,
			blocks: [
				{ id: 'education', kind: 'unit' as const, start: 60, end: 96 },
				{
					id: 'skills-heading',
					kind: 'heading' as const,
					start: 104,
					end: 110,
					keepWithEnd: 120,
				},
				{ id: 'skill-group', kind: 'unit' as const, start: 110, end: 120 },
			],
		};

		// Act
		const plan = planPagination(input);

		// Assert: the heading is pulled up to the top of page 2.
		expect(plan.breaks).toEqual([{ id: 'skills-heading', offset: -4 }]);
	});

	it('keeps later breaks aligned after a block starts past the page end', () => {
		// Arrange
		const input = {
			pageHeight: 100,
			contentHeight: 210,
			blocks: [
				{ id: 'first', kind: 'unit' as const, start: 0, end: 96 },
				{ id: 'second', kind: 'unit' as const, start: 104, end: 190 },
				{ id: 'third', kind: 'unit' as const, start: 190, end: 210 },
			],
		};

		// Act
		const plan = planPagination(input);

		// Assert: 'second' starts page 2 at 100, so 'third' spans 186-206
		// and moves to page 3 at 200.
		expect(plan.breaks).toEqual([
			{ id: 'second', offset: -4 },
			{ id: 'third', offset: 14 },
		]);
	});

	it('breaks before a block that starts exactly on a page boundary', () => {
		// Arrange
		const input = {
			pageHeight: 100,
			contentHeight: 140,
			blocks: [
				{ id: 'first', kind: 'unit' as const, start: 0, end: 100 },
				{ id: 'second', kind: 'unit' as const, start: 100, end: 140 },
			],
		};

		// Act
		const plan = planPagination(input);

		// Assert: a zero offset still marks where the screen page gap belongs.
		expect(plan.breaks).toEqual([{ id: 'second', offset: 0 }]);
	});

	it('returns a stable plan for unchanged measurements', () => {
		const input = {
			pageHeight: 100,
			contentHeight: 160,
			blocks: [
				{ id: 'one', kind: 'unit' as const, start: 0, end: 80 },
				{ id: 'two', kind: 'unit' as const, start: 80, end: 160 },
			],
		};

		expect(planPagination(input)).toEqual(planPagination(input));
	});
});

describe('getPrintableOverflowTarget', () => {
	it('moves a block crossing the bottom margin to the next printable area', () => {
		expect(
			getPrintableOverflowTarget({
				start: 900,
				end: 1020,
				pageHeight: 960,
				pageMargin: 48,
				pageGap: 32,
			}),
		).toBe(1136);
	});

	it('moves content from a page gap to the following printable area', () => {
		expect(
			getPrintableOverflowTarget({
				start: 1064,
				end: 1080,
				pageHeight: 960,
				pageMargin: 48,
				pageGap: 32,
			}),
		).toBe(1136);
	});

	it('leaves content inside the printable area unchanged', () => {
		expect(
			getPrintableOverflowTarget({
				start: 100,
				end: 900,
				pageHeight: 960,
				pageMargin: 48,
				pageGap: 32,
			}),
		).toBeNull();
	});
});
