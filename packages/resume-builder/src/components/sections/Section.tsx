import {
	type FC,
	type HTMLAttributes,
	type PropsWithChildren,
	type ReactNode,
} from 'react';
import clsx from 'clsx';

interface SectionProps extends PropsWithChildren, HTMLAttributes<HTMLElement> {
	heading: string;
	className?: string;
	headerActions?: ReactNode;
}

export const Section: FC<SectionProps> = ({
	children,
	heading,
	className,
	headerActions,
	...rest
}) => {
	const anchorName = heading.toLowerCase().replace(' ', '-');

	return (
		<section className={clsx('section', 'major', className)} {...rest}>
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
