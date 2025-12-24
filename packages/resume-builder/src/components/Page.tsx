import { type FC, type PropsWithChildren } from 'react';

interface PageProps extends PropsWithChildren {}

export const Page: FC<PageProps> = ({ children }) => {
	return (
		<div className="page margin-indicator">
			<section className="page-content">{children}</section>
		</div>
	);
};
