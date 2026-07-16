import clsx from 'clsx';
import {
	type CSSProperties,
	type FC,
	type PropsWithChildren,
	useCallback,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';

import { useSettings } from '@/components/Settings.provider.tsx';

import { getPrintableOverflowTarget, type PaginationBlock, planPagination } from './pagination-planner.ts';

import './PaginatedDocument.css';

const PAGE_HEIGHT_INCHES = 11;
const PAGE_MARGIN_INCHES = 0.5;
const PAGE_GAP_REM = 2;

function inchesToPixels(inches: number): number {
	const probe = document.createElement('div');
	probe.style.position = 'absolute';
	probe.style.visibility = 'hidden';
	probe.style.height = `${inches}in`;
	document.body.appendChild(probe);
	const pixels = probe.getBoundingClientRect().height;
	probe.remove();
	return pixels;
}

function remToPixels(rem: number): number {
	return rem * Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
}

function clearPaginationState(root: HTMLElement): void {
	root.querySelectorAll<HTMLElement>('[data-pagination-generated-unit]').forEach((element) => {
		element.removeAttribute('data-pagination-generated-unit');
		element.removeAttribute('data-pagination-unit');
	});
	root.querySelectorAll<HTMLElement>('[data-pagination-break-before]').forEach((element) => {
		element.removeAttribute('data-pagination-break-before');
		element.style.removeProperty('--pagination-break-offset');
		element.style.removeProperty('--pagination-natural-margin');
	});
	root.querySelectorAll<HTMLElement>('[data-pagination-oversized]').forEach((element) => {
		element.removeAttribute('data-pagination-oversized');
	});
}

function elementBox(element: HTMLElement, origin: number) {
	const rect = element.getBoundingClientRect();
	return { start: rect.top - origin, end: rect.bottom - origin };
}

function collectBlocks(root: HTMLElement, origin: number): PaginationBlock[] {
	const explicitUnits = Array.from(root.querySelectorAll<HTMLElement>('[data-pagination-unit]'));
	const blocks: PaginationBlock[] = explicitUnits.map((unit) => {
		const box = elementBox(unit, origin);
		return {
			id: unit.dataset.paginationUnit!,
			kind: 'unit',
			...box,
			subunits: Array.from(unit.querySelectorAll<HTMLElement>('[data-pagination-subunit]')).map((subunit) => ({
				id: subunit.dataset.paginationSubunit!,
				...elementBox(subunit, origin),
			})),
		};
	});

	root.querySelectorAll<HTMLElement>('[data-pagination-section]').forEach((section, index) => {
		if (section.matches('[data-pagination-unit]')) {
			return;
		}

		const sectionUnits = explicitUnits.filter((unit) => section.contains(unit));
		const heading = section.querySelector<HTMLElement>(':scope > header');

		if (sectionUnits.length === 0) {
			const id = `section-${index}`;
			section.dataset.paginationGeneratedUnit = 'true';
			section.dataset.paginationUnit = id;
			blocks.push({
				id,
				kind: 'unit',
				...elementBox(section, origin),
				subunits: Array.from(section.querySelectorAll<HTMLElement>('[data-pagination-subunit]')).map(
					(subunit) => ({
						id: subunit.dataset.paginationSubunit!,
						...elementBox(subunit, origin),
					}),
				),
			});
			return;
		}

		if (heading) {
			const headingBox = elementBox(heading, origin);
			const id = heading.dataset.paginationHeading ?? `heading-${index}`;
			heading.dataset.paginationHeading = id;
			blocks.push({
				id,
				kind: 'heading',
				...headingBox,
				keepWithEnd: elementBox(sectionUnits[0], origin).end,
			});
		}
	});

	return blocks;
}

function applyRenderedBreak(root: HTMLElement, element: HTMLElement, target: number): void {
	const rootTop = root.getBoundingClientRect().top;
	const renderedTop = element.getBoundingClientRect().top - rootTop;
	const existingOffset = Number.parseFloat(element.style.getPropertyValue('--pagination-break-offset'));
	const naturalMargin =
		element.style.getPropertyValue('--pagination-natural-margin') || getComputedStyle(element).marginBlockStart;

	element.style.setProperty('--pagination-natural-margin', naturalMargin);
	element.style.setProperty(
		'--pagination-break-offset',
		`${(Number.isFinite(existingOffset) ? existingOffset : 0) + target - renderedTop}px`,
	);
	element.setAttribute('data-pagination-break-before', 'true');

	const correctedTop = element.getBoundingClientRect().top - rootTop;
	const correction = target - correctedTop;
	if (Math.abs(correction) <= 0.5) return;

	const offset = Number.parseFloat(element.style.getPropertyValue('--pagination-break-offset'));
	element.style.setProperty('--pagination-break-offset', `${offset + correction}px`);
}

function findRenderedOverflow(
	root: HTMLElement,
	pageHeight: number,
	pageMargin: number,
	pageGap: number,
): { element: HTMLElement; target: number } | null {
	const rootTop = root.getBoundingClientRect().top;
	const targetFor = (element: HTMLElement, endElement = element) => {
		const start = element.getBoundingClientRect().top - rootTop;
		const end = endElement.getBoundingClientRect().bottom - rootTop;
		return getPrintableOverflowTarget({
			start,
			end,
			pageHeight,
			pageMargin,
			pageGap,
		});
	};

	for (const heading of root.querySelectorAll<HTMLElement>('[data-pagination-heading]')) {
		const section = heading.closest<HTMLElement>('[data-pagination-section]');
		const firstUnit = section?.querySelector<HTMLElement>('[data-pagination-unit]');
		const target = targetFor(heading, firstUnit ?? heading);
		if (target !== null) return { element: heading, target };
	}

	for (const unit of root.querySelectorAll<HTMLElement>('[data-pagination-unit]:not([data-pagination-oversized])')) {
		const target = targetFor(unit);
		if (target !== null) return { element: unit, target };
	}

	for (const subunit of root.querySelectorAll<HTMLElement>(
		'[data-pagination-unit][data-pagination-oversized] [data-pagination-subunit]',
	)) {
		const target = targetFor(subunit);
		if (target !== null) return { element: subunit, target };
	}

	return null;
}

export const PaginatedDocument: FC<PropsWithChildren> = ({ children }) => {
	const { showMarginPattern } = useSettings();
	const rootRef = useRef<HTMLDivElement>(null);
	const frameRef = useRef<number | null>(null);
	const [pageCount, setPageCount] = useState(1);
	const [ready, setReady] = useState(false);

	const paginate = useCallback(() => {
		const root = rootRef.current;
		if (!root) return;

		clearPaginationState(root);
		const styles = getComputedStyle(root);
		const paddingTop = Number.parseFloat(styles.paddingTop);
		const paddingBottom = Number.parseFloat(styles.paddingBottom);
		const origin = root.getBoundingClientRect().top + paddingTop;
		const pageHeight = inchesToPixels(PAGE_HEIGHT_INCHES - PAGE_MARGIN_INCHES * 2);
		const margin = inchesToPixels(PAGE_MARGIN_INCHES);
		const pageGap = remToPixels(PAGE_GAP_REM);
		const contentHeight = Math.max(0, root.scrollHeight - paddingTop - paddingBottom);
		const plan = planPagination({
			pageHeight,
			contentHeight,
			blocks: collectBlocks(root, origin),
		});

		for (const id of plan.oversizedUnitIds) {
			root.querySelector<HTMLElement>(`[data-pagination-unit="${CSS.escape(id)}"]`)?.setAttribute(
				'data-pagination-oversized',
				'true',
			);
		}

		for (const pageBreak of plan.breaks) {
			const element = root.querySelector<HTMLElement>(
				`[data-pagination-unit="${CSS.escape(pageBreak.id)}"], ` +
					`[data-pagination-subunit="${CSS.escape(pageBreak.id)}"], ` +
					`[data-pagination-heading="${CSS.escape(pageBreak.id)}"]`,
			);
			if (!element) continue;

			const naturalMargin = getComputedStyle(element).marginBlockStart;
			element.style.setProperty('--pagination-natural-margin', naturalMargin);
			element.style.setProperty('--pagination-break-offset', `${pageBreak.offset + pageGap + margin * 2}px`);
			element.setAttribute('data-pagination-break-before', 'true');

			// CSS margin collapsing can leave a break a few pixels inside the page
			// margin. Snap the rendered unit to the next printable-area origin so
			// the screen sheets use the same boundary as @page when printed.
			const renderedTop = element.getBoundingClientRect().top - root.getBoundingClientRect().top;
			const sheetStride = pageHeight + margin * 2 + pageGap;
			const pageIndex = Math.max(1, Math.round(renderedTop / sheetStride));
			const expectedTop = pageIndex * sheetStride + margin;
			const correction = expectedTop - renderedTop;
			if (Math.abs(correction) > 0.5) {
				element.style.setProperty(
					'--pagination-break-offset',
					`${pageBreak.offset + pageGap + margin * 2 + correction}px`,
				);
			}
		}

		const candidateCount = root.querySelectorAll(
			'[data-pagination-heading], [data-pagination-unit], [data-pagination-subunit]',
		).length;
		for (let index = 0; index <= candidateCount; index += 1) {
			const overflow = findRenderedOverflow(root, pageHeight, margin, pageGap);
			if (!overflow) break;
			applyRenderedBreak(root, overflow.element, overflow.target);
		}

		const sheetStride = pageHeight + margin * 2 + pageGap;
		const renderedPageCount = Math.max(1, Math.ceil(root.scrollHeight / sheetStride));
		const nextPageCount = Math.max(plan.pageCount, renderedPageCount);
		setPageCount((current) => (current === nextPageCount ? current : nextPageCount));
		setReady(true);
	}, []);

	const schedulePagination = useCallback(() => {
		setReady(false);
		if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
		frameRef.current = requestAnimationFrame(() => {
			frameRef.current = null;
			paginate();
		});
	}, [paginate]);

	useLayoutEffect(() => {
		const root = rootRef.current;
		if (!root) return;

		const resizeObserver = new ResizeObserver(schedulePagination);
		const mutationObserver = new MutationObserver(schedulePagination);
		resizeObserver.observe(root);
		mutationObserver.observe(root, { childList: true, characterData: true, subtree: true });
		void document.fonts.ready.then(schedulePagination);
		schedulePagination();

		return () => {
			resizeObserver.disconnect();
			mutationObserver.disconnect();
			if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
		};
	}, [schedulePagination]);

	return (
		<div
			className="paginated-document"
			data-pagination-ready={ready ? 'true' : 'false'}
			data-pagination-page-count={pageCount}
			style={{ '--pagination-page-count': pageCount } as CSSProperties}
		>
			<div className="paginated-page-stack" aria-hidden="true">
				{Array.from({ length: pageCount }, (_, index) => (
					<div
						key={index}
						className={clsx('paginated-page', {
							'margin-indicator': showMarginPattern,
						})}
					/>
				))}
			</div>
			<div ref={rootRef} className="paginated-content">
				{children}
			</div>
		</div>
	);
};
