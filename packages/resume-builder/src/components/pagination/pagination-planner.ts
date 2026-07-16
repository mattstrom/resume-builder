export interface PaginationSubunit {
	id: string;
	start: number;
	end: number;
}

export interface PaginationBlock {
	id: string;
	kind: 'heading' | 'unit';
	start: number;
	end: number;
	keepWithEnd?: number;
	subunits?: PaginationSubunit[];
}

export interface PaginationBreak {
	id: string;
	offset: number;
}

export interface PaginationPlan {
	breaks: PaginationBreak[];
	oversizedUnitIds: string[];
	pageCount: number;
}

interface PlanPaginationOptions {
	pageHeight: number;
	contentHeight: number;
	blocks: PaginationBlock[];
}

interface PrintableOverflowOptions {
	start: number;
	end: number;
	pageHeight: number;
	pageMargin: number;
	pageGap: number;
}

const FIT_TOLERANCE = 0.5;

/**
 * Returns the physical screen position where a block should resume when it
 * intersects a preview-only page margin or gap. Unlike the logical planner,
 * this works on the final rendered page-sheet coordinates.
 */
export function getPrintableOverflowTarget({
	start,
	end,
	pageHeight,
	pageMargin,
	pageGap,
}: PrintableOverflowOptions): number | null {
	const sheetStride = pageHeight + pageMargin * 2 + pageGap;
	if (sheetStride <= 0 || pageHeight <= 0) return null;

	const pageIndex = Math.floor(Math.max(0, start) / sheetStride);
	const printableStart = pageIndex * sheetStride + pageMargin;
	const printableEnd = printableStart + pageHeight;

	if (start < printableStart - FIT_TOLERANCE) {
		return printableStart;
	}

	const nextPrintableStart = (pageIndex + 1) * sheetStride + pageMargin;
	if (start >= printableEnd - FIT_TOLERANCE) {
		return nextPrintableStart;
	}

	if (end > printableEnd + FIT_TOLERANCE && end - start <= pageHeight + FIT_TOLERANCE) {
		return nextPrintableStart;
	}

	return null;
}

function pageStart(position: number, pageHeight: number): number {
	return Math.floor(Math.max(0, position) / pageHeight) * pageHeight;
}

function nextPageStart(position: number, pageHeight: number): number {
	return pageStart(position, pageHeight) + pageHeight;
}

function crossesPage(end: number, start: number, pageHeight: number): boolean {
	return end > nextPageStart(start, pageHeight) + FIT_TOLERANCE;
}

/**
 * Plans page breaks in logical content coordinates. The caller is responsible
 * for adding the screen-only paper margins and gap to each returned offset.
 */
export function planPagination({ pageHeight, contentHeight, blocks }: PlanPaginationOptions): PaginationPlan {
	if (pageHeight <= 0) {
		return { breaks: [], oversizedUnitIds: [], pageCount: 1 };
	}

	const breaks: PaginationBreak[] = [];
	const oversizedUnitIds: string[] = [];
	let accumulatedOffset = 0;

	const addBreak = (id: string, naturalStart: number) => {
		const adjustedStart = naturalStart + accumulatedOffset;
		const offset = nextPageStart(adjustedStart, pageHeight) - adjustedStart;

		if (offset <= FIT_TOLERANCE) {
			return;
		}

		breaks.push({ id, offset });
		accumulatedOffset += offset;
	};

	for (const block of [...blocks].sort((a, b) => a.start - b.start)) {
		const adjustedStart = block.start + accumulatedOffset;
		const blockEnd = block.kind === 'heading' ? (block.keepWithEnd ?? block.end) : block.end;
		const blockHeight = blockEnd - block.start;

		if (block.kind === 'heading') {
			if (
				blockHeight <= pageHeight + FIT_TOLERANCE &&
				crossesPage(blockEnd + accumulatedOffset, adjustedStart, pageHeight)
			) {
				addBreak(block.id, block.start);
			}
			continue;
		}

		if (blockHeight <= pageHeight + FIT_TOLERANCE) {
			if (crossesPage(block.end + accumulatedOffset, adjustedStart, pageHeight)) {
				addBreak(block.id, block.start);
			}
			continue;
		}

		oversizedUnitIds.push(block.id);
		const subunits = block.subunits ?? [];

		if (subunits.length === 0) {
			continue;
		}

		const firstSubunit = subunits[0];
		const adjustedLeadEnd = firstSubunit.end + accumulatedOffset;
		if (crossesPage(adjustedLeadEnd, adjustedStart, pageHeight)) {
			addBreak(block.id, block.start);
		}

		for (const subunit of subunits) {
			const subunitStart = subunit.start + accumulatedOffset;
			const subunitHeight = subunit.end - subunit.start;

			if (
				subunitHeight <= pageHeight + FIT_TOLERANCE &&
				crossesPage(subunit.end + accumulatedOffset, subunitStart, pageHeight)
			) {
				addBreak(subunit.id, subunit.start);
			}
		}
	}

	return {
		breaks,
		oversizedUnitIds,
		pageCount: Math.max(1, Math.ceil((contentHeight + accumulatedOffset) / pageHeight)),
	};
}
