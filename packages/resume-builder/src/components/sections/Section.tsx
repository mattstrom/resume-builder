import clsx from 'clsx';
import { type FC, type HTMLAttributes, type PropsWithChildren } from 'react';

import { HighlightRegion } from '@/components/HighlightRegion.tsx';
import type { ResumeSectionId } from '@/components/sections/section-anchors.ts';

interface SectionProps extends PropsWithChildren, HTMLAttributes<HTMLElement> {
	heading: string;
	className?: string;
	/** Make the whole section highlightable for the given resume data path. */
	path?: string;
	/** Human-readable label shown in the chat focus chips. */
	label?: string;
	/** Stable destination used by web and exported PDF fragment links. */
	anchorId?: ResumeSectionId;
	/** Treat the complete section as one preferred pagination unit. */
	paginationUnit?: string;
}

export const Section: FC<SectionProps> = ({
	children,
	heading,
	className,
	path,
	label,
	anchorId,
	paginationUnit,
	...rest
}) => {
	const section = (
		<section
			id={anchorId}
			className={clsx('section', 'major', className)}
			data-pagination-section
			data-pagination-unit={paginationUnit}
			{...rest}
		>
			<header data-pagination-heading={anchorId ? `${anchorId}-heading` : undefined}>
				<h2>{heading}</h2>
			</header>
			<div>{children}</div>
		</section>
	);

	if (!path) {
		return section;
	}

	return (
		<HighlightRegion path={path} label={label ?? heading}>
			{section}
		</HighlightRegion>
	);
};
