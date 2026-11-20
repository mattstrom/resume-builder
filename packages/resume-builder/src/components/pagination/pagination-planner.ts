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
 *
 * Every block that begins a new page gets a break, even when no block crosses
 * the boundary. On screen the paper margins and gap only exist where a break
 * is applied, so a block that merely starts past the page end (for example,
 * pushed there by a section margin) must still be snapped to the next page.
 */
export function planPagination({ pageHeight, contentHeight, blocks }: PlanPaginationOptions): PaginationPlan {
	if (pageHeight <= 0) {
		return { breaks: [], oversizedUnitIds: [], pageCount: 1 };
	}

	const breaks: PaginationBreak[] = [];
	const oversizedUnitIds: string[] = [];
	let accumulatedOffset = 0;
	// Adjusted end of the content placed so far.
	let placedEnd = 0;

	const breakTo = (id: string, naturalStart: number, target: number) => {
		const offset = target - (naturalStart + accumulatedOffset);
		breaks.push({ id, offset });
		accumulatedOffset += offset;
	};

	// Snaps a block to the top of its page when it starts on a later page than
	// the content before it.
	const snapToPageStart = (id: string, naturalStart: number) => {
		const adjustedStart = naturalStart + accumulatedOffset;
		const startPage = Math.floor((adjustedStart + FIT_TOLERANCE) / pageHeight);
		const placedPage = Math.floor(Math.max(0, placedEnd - FIT_TOLERANCE) / pageHeight);

		if (startPage > placedPage) {
			breakTo(id, naturalStart, startPage * pageHeight);
		}
	};

	// Moves a block that fits on one page to the next page when it would
	// otherwise cross the page end.
	const keepOnOnePage = (id: string, naturalStart: number, naturalEnd: number) => {
		const adjustedStart = naturalStart + accumulatedOffset;

		if (
			naturalEnd - naturalStart <= pageHeight + FIT_TOLERANCE &&
			crossesPage(naturalEnd + accumulatedOffset, adjustedStart, pageHeight)
		) {
			breakTo(id, naturalStart, nextPageStart(adjustedStart, pageHeight));
		}
	};

	for (const block of [...blocks].sort((a, b) => a.start - b.start)) {
		snapToPageStart(block.id, block.start);

		if (block.kind === 'heading') {
			keepOnOnePage(block.id, block.start, block.keepWithEnd ?? block.end);
			placedEnd = block.end + accumulatedOffset;
			continue;
		}

		if (block.end - block.start <= pageHeight + FIT_TOLERANCE) {
			keepOnOnePage(block.id, block.start, block.end);
			placedEnd = block.end + accumulatedOffset;
			continue;
		}

		oversizedUnitIds.push(block.id);
		const subunits = block.subunits ?? [];

		if (subunits.length > 0) {
			const firstSubunit = subunits[0];
			const adjustedStart = block.start + accumulatedOffset;
			if (crossesPage(firstSubunit.end + accumulatedOffset, adjustedStart, pageHeight)) {
				breakTo(block.id, block.start, nextPageStart(adjustedStart, pageHeight));
			}
			placedEnd = block.start + accumulatedOffset;

			for (const subunit of subunits) {
				snapToPageStart(subunit.id, subunit.start);
				keepOnOnePage(subunit.id, subunit.start, subunit.end);
				placedEnd = subunit.end + accumulatedOffset;
			}
		}

		placedEnd = block.end + accumulatedOffset;
	}

	return {
		breaks,
		oversizedUnitIds,
		pageCount: Math.max(1, Math.ceil((contentHeight + accumulatedOffset) / pageHeight)),
	};
}
