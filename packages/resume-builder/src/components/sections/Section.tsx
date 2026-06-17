import clsx from 'clsx';
import { type FC, type HTMLAttributes, type PropsWithChildren, type ReactNode } from 'react';

interface SectionProps extends PropsWithChildren, HTMLAttributes<HTMLElement> {
	heading: string;
	className?: string;
	floatingActions?: ReactNode;
}

export const Section: FC<SectionProps> = ({
	children,
	heading,
	className,
	floatingActions,
	...rest
}) => {
	const anchorName = heading.toLowerCase().replace(' ', '-');

	return (
		<section
			className={clsx('section', 'major', 'group/section relative', className)}
			{...rest}
		>
			<a id={anchorName}></a>
			<header className="flex items-center justify-between gap-2">
				<h2>{heading}</h2>
			</header>
			<div>{children}</div>
			{floatingActions && (
				<div className="absolute right-0 top-0 z-10 flex items-center gap-1 rounded-md border border-border bg-popover/95 px-1 py-0.5 opacity-0 shadow-md transition-opacity focus-within:opacity-100 group-hover/section:opacity-100">
					{floatingActions}
				</div>
			)}
		</section>
	);
};
