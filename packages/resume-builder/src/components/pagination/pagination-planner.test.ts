import { describe, expect, it } from 'vitest';

import { planPagination } from './pagination-planner.ts';

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
		expect(plan.breaks).toEqual([{ id: 'bullet-2', offset: 10 }]);
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
