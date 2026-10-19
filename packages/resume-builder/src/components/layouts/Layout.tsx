import clsx from 'clsx';
import { type FC, type PropsWithChildren } from 'react';

import '@fontsource/roboto/400.css';
import '@fontsource/roboto/700.css';
import '@fontsource/roboto-serif/400.css';
import '@fontsource/roboto-serif/700.css';
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
