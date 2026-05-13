import { observer } from 'mobx-react';
import React, { type MouseEvent } from 'react';
import { type FC, type PropsWithChildren } from 'react';

import { useInspectRegion } from '@/hooks/useInspectRegion.ts';
import { cn } from '@/lib/utils';

interface HighlightRegionProps extends PropsWithChildren {
	path: string;
	label?: string;
}

export const HighlightRegion: FC<HighlightRegionProps> = observer(({ path, label, children }) => {
	const { isInspectMode, isHovered, isSelected, handlers } = useInspectRegion(path, label);

	if (!isInspectMode && !isSelected) {
		return <>{children}</>;
	}

	const child = React.Children.only(children) as React.ReactElement<
		React.HTMLAttributes<HTMLElement>
	>;

	return React.cloneElement(child, {
		className: cn(
			child.props.className,
			'cursor-pointer',
			isSelected
				? 'ring-2 ring-blue-500 ring-inset bg-blue-500/5'
				: isHovered
					? 'ring-2 ring-blue-400/70 ring-inset'
					: undefined,
		),
		onMouseEnter: (e: MouseEvent<HTMLElement>) => {
			handlers.onMouseEnter(e);
			child.props.onMouseEnter?.(e);
		},
		onMouseLeave: (e: MouseEvent<HTMLElement>) => {
			handlers.onMouseLeave(e);
			child.props.onMouseLeave?.(e);
		},
		onClick: (e: MouseEvent<HTMLElement>) => {
			handlers.onClick(e);
			child.props.onClick?.(e);
		},
	});
});
