import * as React from 'react';
import { cn } from '@/lib/utils';

type FlexDirection = 'row' | 'row-reverse' | 'column' | 'column-reverse';

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
	/** Flex direction of the container. Defaults to 'column'. */
	direction?: FlexDirection;
	/** Gap between children, in multiples of 8px (e.g. spacing={2} → 16px). */
	spacing?: number | string;
	/** Node inserted between each child. */
	divider?: React.ReactNode;
	/** CSS align-items value. */
	alignItems?: React.CSSProperties['alignItems'];
	/** CSS justify-content value. */
	justifyContent?: React.CSSProperties['justifyContent'];
	/** CSS flex-wrap value. */
	flexWrap?: React.CSSProperties['flexWrap'];
}

function resolveGap(spacing: number | string | undefined): string | undefined {
	if (spacing === undefined) return undefined;
	if (typeof spacing === 'string') return spacing;
	return `${spacing * 8}px`;
}

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
	(
		{
			direction = 'column',
			spacing,
			divider,
			alignItems,
			justifyContent,
			flexWrap,
			className,
			style,
			children,
			...props
		},
		ref,
	) => {
		const directionClass: Record<FlexDirection, string> = {
			row: 'flex-row',
			'row-reverse': 'flex-row-reverse',
			column: 'flex-col',
			'column-reverse': 'flex-col-reverse',
		};

		const gap = resolveGap(spacing);

		const inlineStyle: React.CSSProperties = {
			...(gap && { gap }),
			...(alignItems && { alignItems }),
			...(justifyContent && { justifyContent }),
			...(flexWrap && { flexWrap }),
			...style,
		};

		let content: React.ReactNode = children;

		if (divider) {
			const childArray = React.Children.toArray(children).filter(Boolean);
			content = childArray.map((child, index) => (
				<React.Fragment key={index}>
					{child}
					{index < childArray.length - 1 && divider}
				</React.Fragment>
			));
		}

		return (
			<div
				ref={ref}
				className={cn('flex', directionClass[direction], className)}
				style={
					Object.keys(inlineStyle).length ? inlineStyle : undefined
				}
				{...props}
			>
				{content}
			</div>
		);
	},
);

Stack.displayName = 'Stack';
