import clsx from 'clsx';
import { type FC, type PropsWithChildren } from 'react';
import { useSettings } from './Settings.provider.tsx';

interface PageProps extends PropsWithChildren {}

export const Page: FC<PageProps> = ({ children }) => {
	const { showMarginPattern } = useSettings();

	return (
		<div
			className={clsx('page', { 'margin-indicator': showMarginPattern })}
		>
			<section className="page-content">{children}</section>
		</div>
	);
};
