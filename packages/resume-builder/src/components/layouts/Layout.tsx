import clsx from 'clsx';
import { type FC, type PropsWithChildren } from 'react';

import './Layout.css';

interface LayoutProps {
	name: string;
}

export const Layout: FC<PropsWithChildren<LayoutProps>> = (props) => {
	return (
		<div className={clsx('layout', props.name)}>
			<article className="resume">{props.children}</article>
		</div>
	);
};
