import clsx from 'clsx';
import { type FC, type PropsWithChildren } from 'react';

interface ColumnProps {
	className: string;
}

export const Column: FC<PropsWithChildren<ColumnProps>> = ({
	className,
	children,
}) => {
	return <div className={clsx('column', className)}>{children}</div>;
};
