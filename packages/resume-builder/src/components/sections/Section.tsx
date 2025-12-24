import { type FC, type PropsWithChildren } from 'react';
import clsx from 'clsx';

interface SectionProps extends PropsWithChildren {
	heading: string;
	className?: string;
}

export const Section: FC<SectionProps> = ({ children, heading, className }) => {
	const anchorName = heading.toLowerCase().replace(' ', '-');

	return (
		<section className={clsx('section', 'major', className)}>
			<a id={anchorName}></a>
			<header>
				<h2>{heading}</h2>
			</header>
			<div>{children}</div>
		</section>
	);
};
