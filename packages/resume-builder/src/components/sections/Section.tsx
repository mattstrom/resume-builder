import clsx from 'clsx';
import { type FC, type HTMLAttributes, type PropsWithChildren } from 'react';

import { HighlightRegion } from '@/components/HighlightRegion.tsx';

interface SectionProps extends PropsWithChildren, HTMLAttributes<HTMLElement> {
	heading: string;
	className?: string;
	/** Make the whole section highlightable for the given resume data path. */
	path?: string;
	/** Human-readable label shown in the chat focus chips. */
	label?: string;
}

export const Section: FC<SectionProps> = ({
	children,
	heading,
	className,
	path,
	label,
	...rest
}) => {
	const anchorName = heading.toLowerCase().replace(' ', '-');

	const section = (
		<section className={clsx('section', 'major', className)} {...rest}>
			<a id={anchorName}></a>
			<header>
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
