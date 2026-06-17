import clsx from 'clsx';
import { type FC, type HTMLAttributes, type PropsWithChildren } from 'react';

interface SectionProps extends PropsWithChildren, HTMLAttributes<HTMLElement> {
	heading: string;
	className?: string;
}

export const Section: FC<SectionProps> = ({ children, heading, className, ...rest }) => {
	const anchorName = heading.toLowerCase().replace(' ', '-');

	return (
		<section className={clsx('section', 'major', className)} {...rest}>
			<a id={anchorName}></a>
			<header>
				<h2>{heading}</h2>
			</header>
			<div>{children}</div>
		</section>
	);
};
