import { type FC, type PropsWithChildren, type ReactNode } from 'react';
import clsx from 'clsx';

interface SectionProps extends PropsWithChildren {
	heading: string;
	className?: string;
	headerActions?: ReactNode;
}

export const Section: FC<SectionProps> = ({
	children,
	heading,
	className,
	headerActions,
}) => {
	const anchorName = heading.toLowerCase().replace(' ', '-');

	return (
		<section className={clsx('section', 'major', className)}>
			<a id={anchorName}></a>
			<header className="flex items-center justify-between gap-2">
				<h2>{heading}</h2>
				{headerActions && (
					<div className="section-header-actions">
						{headerActions}
					</div>
				)}
			</header>
			<div>{children}</div>
		</section>
	);
};
